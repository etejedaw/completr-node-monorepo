import "@testing-library/jest-dom/vitest";

import { HttpErrorResponse } from "@angular/common/http";
import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { FollowRequestsService } from "../../core/services/follow-requests";
import { type IncomingFollowRequest } from "../../core/services/follow-requests.model";
import { ToastService } from "../../core/services/toast";
import { type PendingToastOptions } from "../../core/services/toast.model";
import { FeedService } from "./feed";
import { type FeedActivity } from "./feed.model";
import { FeedPage } from "./feed-page";

function activity(id: string, name: string): FeedActivity {
	return {
		id,
		type: "backlog_completed",
		createdAt: new Date().toISOString(),
		user: {
			id: "me",
			username: "me",
			name: "Me",
			avatarUrl: null
		},
		target: null,
		game: {
			type: "game",
			id: `g-${id}`,
			name,
			code: `code-${id}`
		}
	};
}

function envelope(activities: FeedActivity[]) {
	return { data: { activities, total: activities.length } };
}

function notFound() {
	return new HttpErrorResponse({
		status: 404,
		error: { type: "ACTIVITY_NOT_FOUND" }
	});
}

describe("FeedPage interaction", () => {
	let getFeed: ReturnType<typeof vi.fn>;
	let deleteActivity: ReturnType<typeof vi.fn>;
	let pendingToasts: PendingToastOptions[];
	const toast = {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
		pending: vi.fn()
	};
	const incoming = signal<IncomingFollowRequest[] | null>(null);
	const followRequests = {
		incoming,
		list: vi.fn(() => of([])),
		accept: vi.fn(),
		reject: vi.fn(),
		removeLocally: vi.fn()
	};

	async function renderPage(premium = false) {
		return render(FeedPage, {
			providers: [
				provideRouter([]),
				{ provide: FeedService, useValue: { getFeed, deleteActivity } },
				{ provide: ToastService, useValue: toast },
				{ provide: FollowRequestsService, useValue: followRequests },
				{
					provide: AuthService,
					useValue: {
						user: signal({ id: "me" }),
						hasPremiumFeature: () => premium,
						isPremium: () => premium
					}
				}
			]
		});
	}

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn()
			}))
		);
		pendingToasts = [];
		Object.values(toast).forEach(fn => fn.mockReset());
		toast.pending.mockImplementation((options: PendingToastOptions) => {
			pendingToasts.push(options);
			return pendingToasts.length;
		});
		incoming.set(null);
		followRequests.list.mockClear();
		followRequests.accept.mockReset();
		followRequests.reject.mockReset();
		followRequests.removeLocally.mockReset();
		getFeed = vi.fn(() =>
			of(envelope([activity("a1", "Celeste"), activity("a2", "Hades")]))
		);
		deleteActivity = vi.fn(() => of(null));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("lists the activity of the feed", async () => {
		await renderPage();

		expect(await screen.findByText("Celeste")).toBeInTheDocument();
		expect(screen.getByText("Hades")).toBeInTheDocument();
	});

	it("shows an error with retry instead of an empty feed when the request fails", async () => {
		getFeed.mockReturnValueOnce(
			throwError(() => new HttpErrorResponse({ status: 500 }))
		);
		await renderPage();

		expect(
			await screen.findByText("Couldn't load your feed")
		).toBeInTheDocument();
		expect(screen.queryByText("Your feed is quiet")).toBeNull();

		await userEvent.click(
			screen.getByRole("button", { name: "Try again" })
		);

		expect(await screen.findByText("Celeste")).toBeInTheDocument();
	});

	it("removes the row at once and deletes it only when the undo window commits", async () => {
		await renderPage();
		await screen.findByText("Celeste");

		const item = screen.getByText("Celeste").closest("article")!;
		await userEvent.click(
			within(item).getByRole("button", { name: "Remove this activity" })
		);

		expect(screen.queryByText("Celeste")).toBeNull();
		expect(deleteActivity).not.toHaveBeenCalled();

		pendingToasts[0].onCommit();
		expect(deleteActivity).toHaveBeenCalledWith("a1");
	});

	it("restores only the undone activity and keeps another pending removal", async () => {
		await renderPage();
		await screen.findByText("Celeste");

		for (const name of ["Celeste", "Hades"]) {
			const item = screen.getByText(name).closest("article")!;
			await userEvent.click(
				within(item).getByRole("button", {
					name: "Remove this activity"
				})
			);
		}
		pendingToasts[0].onUndo?.();

		expect(await screen.findByText("Celeste")).toBeInTheDocument();
		expect(screen.queryByText("Hades")).toBeNull();
	});

	it("treats ACTIVITY_NOT_FOUND on delete as already removed", async () => {
		deleteActivity.mockReturnValue(throwError(() => notFound()));
		await renderPage();
		await screen.findByText("Celeste");
		await userEvent.click(
			within(screen.getByText("Celeste").closest("article")!).getByRole(
				"button",
				{ name: "Remove this activity" }
			)
		);

		pendingToasts[0].onCommit();

		expect(screen.queryByText("Celeste")).toBeNull();
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it("puts the row back and warns when the delete fails with a server error", async () => {
		deleteActivity.mockReturnValue(
			throwError(() => new HttpErrorResponse({ status: 500 }))
		);
		await renderPage();
		await screen.findByText("Celeste");
		await userEvent.click(
			within(screen.getByText("Celeste").closest("article")!).getByRole(
				"button",
				{ name: "Remove this activity" }
			)
		);

		pendingToasts[0].onCommit();

		expect(await screen.findByText("Celeste")).toBeInTheDocument();
		expect(toast.warning).toHaveBeenCalledWith(
			"Could not remove that activity."
		);
	});

	it("ignores a late response from a previous filter", async () => {
		const first = new Subject<ReturnType<typeof envelope>>();
		const second = new Subject<ReturnType<typeof envelope>>();
		getFeed
			.mockReturnValueOnce(first)
			.mockReturnValueOnce(second)
			.mockReturnValue(of(envelope([])));
		await renderPage(true);
		await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(1));

		await userEvent.click(
			screen.getAllByRole("button", { name: /Show/ })[0]
		);
		await userEvent.click(
			await screen.findByRole("menuitemradio", { name: /Games/ })
		);
		await waitFor(() => expect(getFeed).toHaveBeenCalledTimes(2));

		second.next(envelope([activity("a9", "Doom")]));
		second.complete();
		first.next(envelope([activity("a1", "Celeste")]));
		first.complete();

		expect(await screen.findByText("Doom")).toBeInTheDocument();
		expect(screen.queryByText("Celeste")).toBeNull();
	});

	it("keeps a follow request out of the list after a double click on Accept", async () => {
		incoming.set([
			{
				requesterId: "r1",
				createdAt: "2026-01-01T00:00:00Z",
				user: { id: "r1", username: "ada", name: "Ada" }
			}
		]);
		const accepted = new Subject<null>();
		followRequests.accept.mockReturnValue(accepted);
		await renderPage();

		const accept = await screen.findByRole("button", { name: "Accept" });
		await userEvent.dblClick(accept);

		expect(followRequests.accept).toHaveBeenCalledTimes(1);
	});
});
