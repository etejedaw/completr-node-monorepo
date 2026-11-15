import "@testing-library/jest-dom/vitest";

import { HttpErrorResponse } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of, Subject, throwError } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { UsersService } from "../../core/services/users";
import { type UserResult } from "../../core/services/users.model";
import { PublicSocialService } from "../public-profile/services/public-social.service";
import { UsersDiscover } from "./users-discover";

function person(id: string, username: string): UserResult {
	return {
		id,
		username,
		name: username,
		avatarUrl: null,
		profileVisibility: "public",
		followerCount: 1,
		gamesTotal: 1,
		completedTotal: 0,
		isFollowing: false
	};
}

describe("UsersDiscover", () => {
	let discover: ReturnType<typeof vi.fn>;
	let search: ReturnType<typeof vi.fn>;
	let follow: ReturnType<typeof vi.fn>;
	const toast = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };

	async function renderPage(loggedIn = false) {
		return render(UsersDiscover, {
			providers: [
				provideRouter([]),
				{ provide: UsersService, useValue: { discover, search } },
				{
					provide: AuthService,
					useValue: { isLoggedIn: () => loggedIn }
				},
				{ provide: ToastService, useValue: toast },
				{
					provide: PublicSocialService,
					useValue: {
						follow,
						unfollow: vi.fn(),
						cancelFollowRequest: vi.fn()
					}
				}
			]
		});
	}

	async function typeQuery(text: string) {
		await userEvent.type(
			screen.getByRole("textbox", {
				name: "Filter players by name or username"
			}),
			text
		);
	}

	beforeEach(() => {
		discover = vi.fn(() => of([person("u1", "ada")]));
		search = vi.fn(() => of([person("u2", "grace")]));
		follow = vi.fn(() => of({ status: "accepted" }));
		Object.values(toast).forEach(fn => fn.mockReset());
	});

	it("filters through the page search scoped to Users", async () => {
		await renderPage();

		expect(
			screen.getByRole("textbox", {
				name: "Filter players by name or username"
			})
		).toBeInTheDocument();
	});

	it("shows an error with retry when discover fails and recovers on retry", async () => {
		discover.mockReturnValueOnce(
			throwError(() => new HttpErrorResponse({ status: 500 }))
		);
		await renderPage();

		expect(
			await screen.findByText("Couldn't load players")
		).toBeInTheDocument();
		expect(screen.queryByText("No public players yet")).toBeNull();

		await userEvent.click(
			screen.getByRole("button", { name: "Try again" })
		);

		expect(await screen.findByText("ada")).toBeInTheDocument();
	});

	it("keeps searching after a failed search instead of dying", async () => {
		search
			.mockReturnValueOnce(
				throwError(() => new HttpErrorResponse({ status: 500 }))
			)
			.mockReturnValue(of([person("u2", "grace")]));
		await renderPage();

		await typeQuery("gr");
		expect(
			await screen.findByText("Couldn't search players")
		).toBeInTheDocument();

		await userEvent.type(
			screen.getByRole("textbox", {
				name: "Filter players by name or username"
			}),
			"a"
		);

		expect(await screen.findByText("grace")).toBeInTheDocument();
	});

	it("does not let a late response of an older query replace the latest results", async () => {
		const slow = new Subject<UserResult[]>();
		search
			.mockReturnValueOnce(slow)
			.mockReturnValue(of([person("u3", "linus")]));
		await renderPage();

		await typeQuery("gr");
		await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
		await typeQuery("ace");
		expect(await screen.findByText("linus")).toBeInTheDocument();

		slow.next([person("u2", "grace")]);
		slow.complete();

		expect(screen.queryByText("grace")).toBeNull();
	});

	it("ignores garbage shorter than two characters", async () => {
		await renderPage();

		await typeQuery("   a  ");

		expect(search).not.toHaveBeenCalled();
	});

	it("sends one follow request per person on a double click", async () => {
		const pending = new Subject<{ status: string }>();
		follow.mockReturnValue(pending);
		await renderPage(true);

		const button = await screen.findByRole("button", {
			name: "Follow ada"
		});
		await userEvent.dblClick(button);

		expect(follow).toHaveBeenCalledTimes(1);
	});
});
