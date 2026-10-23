import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { type PublicProfile } from "../public-profile.service";
import { ProfileHero } from "./profile-hero";

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
	return {
		user: {
			id: "u1",
			username: "ada",
			name: "Ada Lovelace",
			role: "user",
			bio: "Plays everything",
			createdAt: "2025-03-15T00:00:00.000Z"
		},
		followerCount: 3,
		followingCount: 5,
		isFollowing: false,
		backlogs: [],
		backlogTotal: 0,
		backlogStats: {
			not_started: 0,
			playing: 0,
			completed: 0,
			abandoned: 0,
			total: 0
		},
		listsTotal: 0,
		recentActivity: [],
		...overrides
	} as PublicProfile;
}

describe("ProfileHero", () => {
	function renderHero(
		inputs: Record<string, unknown>,
		profileOverrides: Partial<PublicProfile> = {}
	) {
		return render(ProfileHero, {
			providers: [provideRouter([])],
			inputs: { profile: profile(profileOverrides), ...inputs }
		});
	}

	it("shows the name, username, join date and bio", async () => {
		await renderHero({});

		expect(
			screen.getByRole("heading", { name: "Ada Lovelace" })
		).toBeInTheDocument();
		expect(screen.getByText("@ada")).toBeInTheDocument();
		expect(screen.getByText(/Joined March 2025/)).toBeInTheDocument();
		expect(screen.getByText("Plays everything")).toBeInTheDocument();
	});

	it("falls back to the username when the user has no name", async () => {
		await render(ProfileHero, {
			providers: [provideRouter([])],
			inputs: {
				profile: {
					...profile(),
					user: { ...profile().user, name: "" }
				}
			}
		});

		expect(
			screen.getByRole("heading", { name: "ada" })
		).toBeInTheDocument();
	});

	it("links the counters to the followers and following lists", async () => {
		await renderHero({});

		expect(
			screen.getByRole("link", { name: /3\s*followers/ })
		).toHaveAttribute("href", "/user/ada/followers");
		expect(
			screen.getByRole("link", { name: /5\s*following/ })
		).toHaveAttribute("href", "/user/ada/following");
	});

	it("uses the singular for a single follower", async () => {
		await renderHero({}, { followerCount: 1 });

		expect(
			screen.getByRole("link", { name: /1\s*follower$/ })
		).toBeInTheDocument();
	});

	it("shows an elevated role badge", async () => {
		await render(ProfileHero, {
			providers: [provideRouter([])],
			inputs: {
				profile: {
					...profile(),
					user: { ...profile().user, role: "premium" }
				}
			}
		});

		expect(screen.getByText("Premium")).toBeInTheDocument();
	});

	it("does not show a badge for a regular user", async () => {
		await renderHero({});

		expect(screen.queryByText("Premium")).not.toBeInTheDocument();
		expect(screen.queryByText("Admin")).not.toBeInTheDocument();
	});

	describe("primary action", () => {
		it("offers editing the profile to its owner instead of following", async () => {
			await renderHero({ isSelf: true, isLoggedIn: true });

			expect(
				screen.getByRole("link", { name: /edit profile/i })
			).toHaveAttribute("href", "/settings/profile");
			expect(
				screen.queryByRole("button", { name: /follow/i })
			).not.toBeInTheDocument();
		});

		it("sends a signed-out visitor to the login page", async () => {
			await renderHero({ isLoggedIn: false });

			expect(
				screen.getByRole("link", { name: "Follow" })
			).toHaveAttribute("href", "/login");
		});

		it("offers Follow to a signed-in visitor who does not follow", async () => {
			await renderHero({ isLoggedIn: true });

			expect(
				screen.getByRole("button", { name: /Follow$/ })
			).toHaveAttribute("aria-pressed", "false");
		});

		it("shows Following when the visitor already follows", async () => {
			await renderHero({ isLoggedIn: true }, { isFollowing: true });

			expect(
				screen.getByRole("button", { name: /Following/ })
			).toHaveAttribute("aria-pressed", "true");
		});

		it("shows Requested, with a cancel hint, when a follow request is pending", async () => {
			await renderHero({ isLoggedIn: true }, { hasPendingRequest: true });

			expect(
				screen.getByRole("button", { name: /Requested/ })
			).toHaveAttribute("title", "Cancel follow request");
		});

		it("emits followToggled when the button is clicked", async () => {
			const user = userEvent.setup();
			const followToggled = vi.fn();
			await render(ProfileHero, {
				providers: [provideRouter([])],
				inputs: { profile: profile(), isLoggedIn: true },
				on: { followToggled }
			});

			await user.click(screen.getByRole("button", { name: /Follow/ }));

			expect(followToggled).toHaveBeenCalledTimes(1);
		});

		it("disables the button while a follow change is in flight", async () => {
			await renderHero({ isLoggedIn: true, togglingFollow: true });

			expect(
				screen.getByRole("button", { name: /Follow/ })
			).toBeDisabled();
		});
	});

	it("emits shared when the share button is clicked", async () => {
		const user = userEvent.setup();
		const shared = vi.fn();
		await render(ProfileHero, {
			providers: [provideRouter([])],
			inputs: { profile: profile() },
			on: { shared }
		});

		await user.click(screen.getByRole("button", { name: "Share profile" }));

		expect(shared).toHaveBeenCalledTimes(1);
	});
});
