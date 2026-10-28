import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { of } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type User } from "../../../core/models/user.model";
import { AuthService } from "../../../core/services/auth";
import { ToastService } from "../../../core/services/toast";
import { SettingsPrivacy } from "./settings-privacy";

const api = environment.apiUrl;

const publicUser = {
	id: "u1",
	username: "ada",
	role: "user",
	profileVisibility: "public",
	backlogVisibility: "public",
	shelfVisibility: "public",
	listVisibility: "public",
	queueVisibility: "public",
	wishlistVisibility: "public",
	favoriteVisibility: "public",
	feedVisibility: "public",
	platinumVisibility: "public",
	franchiseVisibility: "public",
	rewindVisibility: "public",
	acceptFollowRequests: true
} as unknown as User;

const incomingRequest = {
	requesterId: "u2",
	createdAt: "2026-01-01T00:00:00.000Z",
	user: { id: "u2", username: "grace", name: "Grace Hopper" }
};

describe("SettingsPrivacy", () => {
	let httpTesting: HttpTestingController;
	const user = signal<User | null>(null);
	const loadUser = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn() };

	async function renderPrivacy(
		overrides: Partial<User> | null = {},
		requests: unknown[] = []
	) {
		user.set(overrides ? ({ ...publicUser, ...overrides } as User) : null);
		const result = await render(SettingsPrivacy, {
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([]),
				{ provide: AuthService, useValue: { user, loadUser } },
				{ provide: ToastService, useValue: toast }
			]
		});
		httpTesting = TestBed.inject(HttpTestingController);
		httpTesting
			.expectOne(`${api}/users/me/follow-requests`)
			.flush({ data: { requests } });
		await result.fixture.whenStable();
		result.fixture.detectChanges();
		return result;
	}

	function radioGroup(name: string) {
		return screen.getByRole("radiogroup", { name });
	}

	function selectedOption(group: HTMLElement) {
		return within(group)
			.getAllByRole("radio")
			.find(radio => radio.getAttribute("aria-checked") === "true")
			?.textContent?.trim();
	}

	beforeEach(() => {
		toast.success.mockReset();
		toast.warning.mockReset();
		loadUser.mockReset().mockReturnValue(of(undefined));
	});

	afterEach(() => {
		httpTesting.match(() => true);
		httpTesting.verify();
	});

	it("shows a loading skeleton until the user is available", async () => {
		await renderPrivacy(null);

		expect(
			screen.getByLabelText("Loading privacy settings")
		).toBeInTheDocument();
		expect(screen.queryByText("Privacy level")).not.toBeInTheDocument();
	});

	it("offers the four privacy presets", async () => {
		await renderPrivacy();

		const presets = within(radioGroup("Privacy level")).getAllByRole(
			"radio"
		);
		expect(presets.map(preset => preset.textContent)).toEqual([
			expect.stringContaining("Everyone"),
			expect.stringContaining("Friends"),
			expect.stringContaining("Only you"),
			expect.stringContaining("Custom")
		]);
	});

	it("starts on the preset matching the user's saved levels", async () => {
		await renderPrivacy({
			profileVisibility: "friends",
			backlogVisibility: "friends",
			shelfVisibility: "friends",
			listVisibility: "friends",
			queueVisibility: "friends",
			wishlistVisibility: "friends",
			favoriteVisibility: "friends",
			feedVisibility: "friends",
			platinumVisibility: "friends",
			franchiseVisibility: "friends",
			rewindVisibility: "friends"
		});

		expect(selectedOption(radioGroup("Privacy level"))).toContain(
			"Friends"
		);
		expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
	});

	it("starts on Custom when the saved levels differ", async () => {
		await renderPrivacy({ queueVisibility: "private" });

		expect(selectedOption(radioGroup("Privacy level"))).toContain("Custom");
		expect(selectedOption(radioGroup("Up Next visibility"))).toContain(
			"Only you"
		);
		expect(selectedOption(radioGroup("Profile visibility"))).toContain(
			"Everyone"
		);
	});

	it("applies a preset to the profile and every section and offers to save", async () => {
		const userInteraction = userEvent.setup();
		await renderPrivacy({ queueVisibility: "private" });

		await userInteraction.click(
			within(radioGroup("Privacy level")).getByRole("radio", {
				name: /only you/i
			})
		);

		expect(selectedOption(radioGroup("Privacy level"))).toContain(
			"Only you"
		);
		expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /customize/i })
		).toBeInTheDocument();
	});

	it("only shows the follow-request switch for private profiles", async () => {
		const userInteraction = userEvent.setup();
		await renderPrivacy();

		expect(
			screen.queryByText("Allow follow requests")
		).not.toBeInTheDocument();

		await userInteraction.click(
			screen.getByRole("radio", { name: /only you/i })
		);

		expect(screen.getByText("Allow follow requests")).toBeInTheDocument();
	});

	it("explains when a section is effectively narrower than its own level", async () => {
		const userInteraction = userEvent.setup();
		await renderPrivacy();

		await userInteraction.click(
			within(radioGroup("Privacy level")).getByRole("radio", {
				name: /custom/i
			})
		);
		await userInteraction.click(
			within(radioGroup("Profile visibility")).getByRole("radio", {
				name: /only you/i
			})
		);

		expect(screen.getByRole("note")).toHaveTextContent(
			"Your profile is set to Only you"
		);
		expect(
			screen.getAllByText("Effectively Only you").length
		).toBeGreaterThan(0);
	});

	it("saves the draft and confirms with a toast", async () => {
		const userInteraction = userEvent.setup();
		await renderPrivacy();

		await userInteraction.click(
			screen.getByRole("radio", { name: /friends/i })
		);
		await userInteraction.click(
			screen.getByRole("button", { name: /save changes/i })
		);

		const patch = httpTesting.expectOne(`${api}/users/me`);
		expect(patch.request.method).toBe("PATCH");
		expect(patch.request.body).toEqual({
			profileVisibility: "friends",
			backlogVisibility: "friends",
			shelfVisibility: "friends",
			listVisibility: "friends",
			queueVisibility: "friends",
			wishlistVisibility: "friends",
			favoriteVisibility: "friends",
			feedVisibility: "friends",
			platinumVisibility: "friends",
			franchiseVisibility: "friends",
			rewindVisibility: "friends",
			acceptFollowRequests: true
		});
		patch.flush({ data: { user: publicUser } });
		httpTesting
			.expectOne(`${api}/users/me/follow-requests`)
			.flush({ data: { requests: [] } });

		await waitFor(() =>
			expect(
				screen.queryByText("Unsaved changes")
			).not.toBeInTheDocument()
		);
		expect(toast.success).toHaveBeenCalledWith("Privacy settings updated.");
		expect(loadUser).toHaveBeenCalled();
		expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
	});

	it("keeps the draft and warns when the API rejects the save", async () => {
		const userInteraction = userEvent.setup();
		await renderPrivacy();

		await userInteraction.click(
			screen.getByRole("radio", { name: /only you/i })
		);
		await userInteraction.click(
			screen.getByRole("button", { name: /save changes/i })
		);
		httpTesting
			.expectOne(`${api}/users/me`)
			.flush(null, { status: 500, statusText: "Server Error" });
		await screen.findByRole("button", { name: /save changes/i });

		expect(toast.warning).toHaveBeenCalledWith(
			"Could not update privacy settings."
		);
		expect(toast.success).not.toHaveBeenCalled();
		expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /save changes/i })
		).toBeEnabled();
	});

	it("restores the saved levels when the changes are discarded", async () => {
		const userInteraction = userEvent.setup();
		await renderPrivacy();

		await userInteraction.click(
			screen.getByRole("radio", { name: /only you/i })
		);
		await userInteraction.click(
			screen.getByRole("button", { name: /discard/i })
		);

		expect(selectedOption(radioGroup("Privacy level"))).toContain(
			"Everyone"
		);
		expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
	});

	describe("follow requests", () => {
		const privateProfile = { profileVisibility: "private" } as const;

		it("is hidden for profiles that are not private", async () => {
			await renderPrivacy({}, [incomingRequest]);

			expect(
				screen.queryByText("Follow requests")
			).not.toBeInTheDocument();
		});

		it("is hidden when the private profile does not accept requests", async () => {
			await renderPrivacy(
				{ ...privateProfile, acceptFollowRequests: false },
				[incomingRequest]
			);

			expect(
				screen.queryByText("Follow requests")
			).not.toBeInTheDocument();
		});

		it("lists pending requests for a private profile", async () => {
			await renderPrivacy(privateProfile, [incomingRequest]);

			expect(screen.getByText("Follow requests")).toBeInTheDocument();
			expect(screen.getByText("1 pending")).toBeInTheDocument();
			expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
			expect(screen.getByText("@grace")).toBeInTheDocument();
		});

		it("shows an empty message when nobody has asked", async () => {
			await renderPrivacy(privateProfile, []);

			expect(
				screen.getByText("No pending requests.")
			).toBeInTheDocument();
		});

		it("accepts a request and removes it from the list", async () => {
			const userInteraction = userEvent.setup();
			await renderPrivacy(privateProfile, [incomingRequest]);

			await userInteraction.click(
				screen.getByRole("button", { name: "Accept" })
			);
			const accept = httpTesting.expectOne(
				`${api}/users/me/follow-requests/u2/accept`
			);
			expect(accept.request.method).toBe("POST");
			accept.flush({});

			expect(
				await screen.findByText("No pending requests.")
			).toBeInTheDocument();
			expect(toast.success).toHaveBeenCalledWith(
				"Follow request accepted."
			);
			expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
		});

		it("warns and keeps the request when accepting fails", async () => {
			const userInteraction = userEvent.setup();
			await renderPrivacy(privateProfile, [incomingRequest]);

			await userInteraction.click(
				screen.getByRole("button", { name: "Accept" })
			);
			httpTesting
				.expectOne(`${api}/users/me/follow-requests/u2/accept`)
				.flush(null, { status: 500, statusText: "Server Error" });
			await waitFor(() =>
				expect(
					screen.getByRole("button", { name: "Accept" })
				).toBeEnabled()
			);

			expect(toast.warning).toHaveBeenCalledWith(
				"Could not accept the request."
			);
			expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
		});

		it("declines a request and removes it from the list", async () => {
			const userInteraction = userEvent.setup();
			await renderPrivacy(privateProfile, [incomingRequest]);

			await userInteraction.click(
				screen.getByRole("button", { name: "Decline" })
			);
			httpTesting
				.expectOne(`${api}/users/me/follow-requests/u2/reject`)
				.flush({});

			expect(
				await screen.findByText("No pending requests.")
			).toBeInTheDocument();
			expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
		});

		it("warns when declining fails", async () => {
			const userInteraction = userEvent.setup();
			await renderPrivacy(privateProfile, [incomingRequest]);

			await userInteraction.click(
				screen.getByRole("button", { name: "Decline" })
			);
			httpTesting
				.expectOne(`${api}/users/me/follow-requests/u2/reject`)
				.flush(null, { status: 500, statusText: "Server Error" });
			await waitFor(() =>
				expect(toast.warning).toHaveBeenCalledWith(
					"Could not reject the request."
				)
			);
			expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
		});
	});
});
