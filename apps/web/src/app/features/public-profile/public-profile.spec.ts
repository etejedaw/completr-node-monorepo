import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { BehaviorSubject, of, Subject, throwError } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { FeedService } from "../feed/feed";
import { PublicProfileComponent } from "./public-profile";
import {
	type ProfileSectionAccess,
	type PublicProfile,
	PublicProfileService
} from "./public-profile.service";
import { PublicLibraryService } from "./services/public-library.service";
import { PublicListsService } from "./services/public-lists.service";
import { PublicReviewsService } from "./services/public-reviews.service";
import { PublicSocialService } from "./services/public-social.service";

const openAccess: ProfileSectionAccess = {
	profile: true,
	queue: true,
	wishlist: true,
	favorite: true,
	feed: true,
	backlog: true,
	shelf: true,
	list: true,
	platinum: true
};

const closedAccess: ProfileSectionAccess = {
	profile: true,
	queue: false,
	wishlist: false,
	favorite: false,
	feed: false,
	backlog: false,
	shelf: false,
	list: false,
	platinum: false
};

const recentActivity = [
	{
		id: "a1",
		type: "backlog_completed",
		createdAt: "2026-02-01T00:00:00.000Z",
		target: null,
		game: {
			type: "game",
			id: "g1",
			name: "Hades",
			code: "hades",
			backgroundUrl: null
		}
	}
];

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
	return {
		user: {
			id: "u-ada",
			username: "ada",
			name: "Ada Lovelace",
			role: "user",
			createdAt: "2025-03-15T00:00:00.000Z"
		},
		followerCount: 3,
		followingCount: 5,
		isFollowing: false,
		backlogs: [],
		backlogTotal: 20,
		backlogStats: {
			not_started: 5,
			playing: 2,
			completed: 10,
			abandoned: 3,
			total: 20
		},
		listsTotal: 4,
		recentActivity,
		access: openAccess,
		...overrides
	} as PublicProfile;
}

function privateProfile(overrides: Partial<PublicProfile> = {}) {
	return profile({
		isPrivate: true,
		access: undefined,
		recentActivity: [],
		backlogStats: undefined,
		...overrides
	} as Partial<PublicProfile>);
}

const emptyHighlights = {
	recent: [],
	month: {
		startsAt: "2026-02-01T00:00:00.000Z",
		endsAt: "2026-02-28T00:00:00.000Z",
		completedCount: 0,
		longestPlayed: null,
		bestPersonalRatio: null,
		highestRated: null
	}
};

describe("PublicProfileComponent", () => {
	const authUser = signal<{ id: string } | null>(null);
	const loggedIn = signal(false);
	const getProfile = vi.fn();
	const follow = vi.fn();
	const unfollow = vi.fn();
	const cancelFollowRequest = vi.fn();
	const getUserFavorites = vi.fn();
	const getUserPlatinums = vi.fn();
	const getUserQueue = vi.fn();
	const getUserFranchises = vi.fn();
	const getComparison = vi.fn();
	const getUserReviews = vi.fn();
	const getHighlights = vi.fn();
	const toast = { success: vi.fn(), warning: vi.fn(), pending: vi.fn() };

	beforeEach(() => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
		authUser.set(null);
		loggedIn.set(false);
		for (const fn of [
			getProfile,
			follow,
			unfollow,
			cancelFollowRequest,
			getUserFavorites,
			getUserQueue,
			getUserPlatinums,
			getUserFranchises,
			getComparison,
			getUserReviews,
			getHighlights
		]) {
			fn.mockReset();
		}
		toast.success.mockReset();
		toast.warning.mockReset();
		toast.pending.mockReset();
		getUserFavorites.mockReturnValue(of({ items: [], total: 0 }));
		getUserPlatinums.mockReturnValue(of({ items: [], total: 0 }));
		getUserQueue.mockReturnValue(of({ items: [], total: 0 }));
		getUserFranchises.mockReturnValue(of([]));
		getUserReviews.mockReturnValue(of({ reviews: [], total: 0 }));
		getHighlights.mockReturnValue(of(emptyHighlights));
		getComparison.mockReturnValue(
			of({ inCommon: [], counts: { inCommon: 0 } })
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderProfile({
		data,
		user = null,
		username = "ada"
	}: {
		data: unknown;
		user?: { id: string } | null;
		username?: string;
	}) {
		authUser.set(user);
		loggedIn.set(user !== null);
		if (data instanceof Error) {
			getProfile.mockReturnValue(throwError(() => data));
		} else if (data instanceof Subject) {
			getProfile.mockReturnValue(data);
		} else {
			getProfile.mockReturnValue(of(data));
		}
		return render(PublicProfileComponent, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { queryParamMap: { get: () => null } },
						paramMap: new BehaviorSubject({
							get: () => username
						})
					}
				},
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						user: authUser,
						isLoggedIn: loggedIn,
						loadUser: vi.fn()
					}
				},
				{ provide: ToastService, useValue: toast },
				{
					provide: FeedService,
					useValue: { deleteActivity: vi.fn(() => of({})) }
				},
				{ provide: PublicProfileService, useValue: { getProfile } },
				{
					provide: PublicSocialService,
					useValue: { follow, unfollow, cancelFollowRequest }
				},
				{
					provide: PublicLibraryService,
					useValue: {
						getUserFavorites,
						getUserPlatinums,
						getUserQueue,
						getUserFranchises,
						getComparison,
						getUserBacklog: vi.fn(() =>
							of({ items: [], total: 0 })
						),
						getUserGameShelf: vi.fn(() =>
							of({ items: [], total: 0 })
						),
						getUserWishlist: vi.fn(() =>
							of({ items: [], total: 0 })
						)
					}
				},
				{
					provide: PublicReviewsService,
					useValue: { getUserReviews, getHighlights }
				},
				{
					provide: PublicListsService,
					useValue: {
						getUserLists: vi.fn(() => of({ items: [], total: 0 })),
						getUserFollowingLists: vi.fn(() =>
							of({ items: [], total: 0 })
						)
					}
				}
			]
		});
	}

	it("shows a loading state until the profile arrives", async () => {
		await renderProfile({ data: new Subject() });

		expect(screen.getByLabelText("Loading profile")).toBeInTheDocument();
	});

	it("requests the profile of the user in the URL", async () => {
		await renderProfile({ data: profile(), username: "grace" });

		expect(getProfile).toHaveBeenCalledWith("grace");
	});

	describe("player that does not exist", () => {
		it("says the player was not found", async () => {
			await renderProfile({
				data: Object.assign(new Error("nope"), { status: 404 }),
				username: "ghost"
			});

			expect(
				await screen.findByRole("heading", { name: "Player not found" })
			).toBeInTheDocument();
			expect(
				screen.getByText(/no one called "ghost"/)
			).toBeInTheDocument();
			expect(getUserReviews).not.toHaveBeenCalled();
		});
	});

	describe("private profile", () => {
		it("shows only the identity and counters to a signed-out visitor, who is invited to sign in", async () => {
			await renderProfile({ data: privateProfile() });

			expect(
				await screen.findByRole("heading", { name: "Ada Lovelace" })
			).toBeInTheDocument();
			expect(screen.getByText("@ada")).toBeInTheDocument();
			expect(
				screen.getByText(/This profile is private/)
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Sign in to follow" })
			).toHaveAttribute("href", "/login");
			expect(
				screen.queryByRole("button", { name: /follow/i })
			).not.toBeInTheDocument();
		});

		it("does not load any section of a private profile", async () => {
			await renderProfile({
				data: privateProfile(),
				user: { id: "u-grace" }
			});

			await screen.findByText(/This profile is private/);
			expect(getUserReviews).not.toHaveBeenCalled();
			expect(getHighlights).not.toHaveBeenCalled();
			expect(getUserFavorites).not.toHaveBeenCalled();
			expect(getUserPlatinums).not.toHaveBeenCalled();
			expect(getUserQueue).not.toHaveBeenCalled();
			expect(getUserFranchises).not.toHaveBeenCalled();
			expect(getComparison).not.toHaveBeenCalled();
			expect(
				screen.queryByLabelText("Profile stats")
			).not.toBeInTheDocument();
		});

		it("lets a signed-in visitor ask to follow when the profile accepts requests", async () => {
			const user = userEvent.setup();
			follow.mockReturnValue(
				of({ status: "pending", targetId: "u-ada" })
			);
			await renderProfile({
				data: privateProfile({ acceptFollowRequests: true }),
				user: { id: "u-grace" }
			});

			await user.click(
				await screen.findByRole("button", { name: /Request to follow/ })
			);

			expect(follow).toHaveBeenCalledWith("ada");
			expect(
				await screen.findByRole("button", { name: /Requested/ })
			).toBeInTheDocument();
		});

		it("cancels the pending request when the visitor clicks Requested", async () => {
			const user = userEvent.setup();
			cancelFollowRequest.mockReturnValue(of({}));
			await renderProfile({
				data: privateProfile({
					acceptFollowRequests: true,
					hasPendingRequest: true
				}),
				user: { id: "u-grace" }
			});

			await user.click(
				await screen.findByRole("button", { name: /Requested/ })
			);

			expect(cancelFollowRequest).toHaveBeenCalledWith("ada");
			expect(
				await screen.findByRole("button", { name: /Request to follow/ })
			).toBeInTheDocument();
		});

		it("offers no follow button when the profile does not accept requests", async () => {
			await renderProfile({
				data: privateProfile({ acceptFollowRequests: false }),
				user: { id: "u-grace" }
			});

			await screen.findByText(/This profile is private/);
			expect(
				screen.queryByRole("button", { name: /follow|requested/i })
			).not.toBeInTheDocument();
		});

		it("still lets a current follower unfollow even if requests are closed", async () => {
			await renderProfile({
				data: privateProfile({
					acceptFollowRequests: false,
					isFollowing: true
				}),
				user: { id: "u-grace" }
			});

			expect(
				await screen.findByRole("button", { name: /Following/ })
			).toBeInTheDocument();
		});
	});

	describe("public profile", () => {
		it("shows the hero, the stats and the reviews sample", async () => {
			getUserReviews.mockReturnValue(
				of({
					reviews: [
						{
							id: "r1",
							content: "Great loop",
							rating: 5,
							createdAt: "2026-01-02T00:00:00.000Z",
							game: { id: "g1", code: "hades", title: "Hades" }
						}
					],
					total: 9
				})
			);
			await renderProfile({ data: profile() });

			expect(
				await screen.findByRole("heading", { name: "Ada Lovelace" })
			).toBeInTheDocument();
			expect(screen.getByLabelText("Profile stats")).toBeInTheDocument();
			expect(await screen.findByText("Great loop")).toBeInTheDocument();
			expect(getUserReviews).toHaveBeenCalledWith("ada", { limit: 20 });
			expect(screen.getByRole("link", { name: "All 9" })).toHaveAttribute(
				"href",
				"/user/ada/reviews"
			);
		});

		it("loads the library sections the owner makes visible", async () => {
			await renderProfile({ data: profile() });

			await screen.findByLabelText("Profile stats");
			expect(getHighlights).toHaveBeenCalledWith(
				"ada",
				expect.objectContaining({ year: expect.any(Number) })
			);
			expect(getUserFavorites).toHaveBeenCalledWith("ada", {
				limit: expect.any(Number)
			});
			expect(getUserQueue).toHaveBeenCalledWith("ada", { limit: 10 });
			expect(getUserPlatinums).toHaveBeenCalledWith("ada", { limit: 8 });
			expect(getUserFranchises).toHaveBeenCalledWith("ada");
		});

		it("does not request anything the owner keeps hidden", async () => {
			await renderProfile({
				data: profile({ access: closedAccess })
			});

			await screen.findByLabelText("Profile stats");
			expect(getHighlights).not.toHaveBeenCalled();
			expect(getUserFavorites).not.toHaveBeenCalled();
			expect(getUserPlatinums).not.toHaveBeenCalled();
			expect(getUserQueue).not.toHaveBeenCalled();
			expect(getUserFranchises).not.toHaveBeenCalled();
		});

		it("hides the library counters when the backlog is hidden", async () => {
			await renderProfile({
				data: profile({ access: closedAccess })
			});

			await screen.findByLabelText("Profile stats");
			expect(
				screen.queryByRole("link", { name: /In library/ })
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("Library breakdown")
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("Recently completed")
			).not.toBeInTheDocument();
		});

		it("shows the library counters when the backlog is visible", async () => {
			await renderProfile({ data: profile() });

			expect(
				await screen.findByRole("link", { name: /In library/ })
			).toBeInTheDocument();
			expect(screen.getByText("Library breakdown")).toBeInTheDocument();
		});

		it("shows the favorites shelf only when favorites are visible and not empty", async () => {
			getUserFavorites.mockReturnValue(
				of({
					items: [
						{
							id: "f1",
							position: 1,
							game: { id: "g1", code: "hades", title: "Hades" }
						}
					],
					total: 1
				})
			);
			await renderProfile({ data: profile() });

			expect(
				await screen.findByRole("heading", { name: "Favorite games" })
			).toBeInTheDocument();
			expect(screen.getByText("#1")).toBeInTheDocument();
		});

		it("omits the favorites shelf when favorites are hidden", async () => {
			getUserFavorites.mockReturnValue(
				of({
					items: [
						{
							id: "f1",
							position: 1,
							game: { id: "g1", code: "hades", title: "Hades" }
						}
					],
					total: 1
				})
			);
			await renderProfile({
				data: profile({ access: { ...openAccess, favorite: false } })
			});

			await screen.findByLabelText("Profile stats");
			expect(
				screen.queryByRole("heading", { name: "Favorite games" })
			).not.toBeInTheDocument();
		});

		describe("platinums", () => {
			const platinumPage = {
				items: [
					{
						id: "p1",
						backlogId: null,
						platformId: "ps5",
						platinumedAt: "2026-03-12",
						platform: {
							id: "ps5",
							name: "PlayStation 5",
							abbreviation: "PS5"
						},
						game: {
							id: "g1",
							code: "astro-bot",
							title: "Astro Bot",
							isDlc: false
						}
					}
				],
				total: 12
			};

			it("shows the latest platinums with the total and a link to all of them", async () => {
				getUserPlatinums.mockReturnValue(of(platinumPage));
				await renderProfile({ data: profile() });

				const heading = await screen.findByRole("heading", {
					name: "Platinums"
				});
				const section = heading.closest("section")!;
				expect(section).toHaveTextContent("12 platinums");
				expect(section).toHaveTextContent("Astro Bot");
				expect(section).toHaveTextContent("PS5");
				expect(section).toHaveTextContent("Mar 12, 2026");
				expect(
					section.querySelector('a[href="/user/ada/platinums"]')
				).not.toBeNull();
			});

			it("shows nothing when the owner has no platinums", async () => {
				await renderProfile({ data: profile() });

				await screen.findByLabelText("Profile stats");
				await waitFor(() =>
					expect(getUserPlatinums).toHaveBeenCalled()
				);
				expect(
					screen.queryByRole("heading", { name: "Platinums" })
				).not.toBeInTheDocument();
			});

			it("neither requests nor shows the platinums when they are hidden", async () => {
				getUserPlatinums.mockReturnValue(of(platinumPage));
				await renderProfile({
					data: profile({
						access: { ...openAccess, platinum: false }
					})
				});

				await screen.findByLabelText("Profile stats");
				expect(getUserPlatinums).not.toHaveBeenCalled();
				expect(
					screen.queryByRole("heading", { name: "Platinums" })
				).not.toBeInTheDocument();
			});
		});

		it("shows the recent activity when the feed is visible", async () => {
			await renderProfile({ data: profile() });

			expect(
				await screen.findByRole("heading", { name: "Recent activity" })
			).toBeInTheDocument();
			expect(
				screen.getByText(/completed/, { selector: "p" })
			).toHaveTextContent(/completed\s*Hades/);
		});

		it("hides the recent activity from visitors when the feed is hidden", async () => {
			await renderProfile({
				data: profile({ access: { ...openAccess, feed: false } })
			});

			await screen.findByLabelText("Profile stats");
			expect(
				screen.queryByRole("heading", { name: "Recent activity" })
			).not.toBeInTheDocument();
		});

		it("hides the recent activity when the feed is visible but empty", async () => {
			await renderProfile({ data: profile({ recentActivity: [] }) });

			await screen.findByLabelText("Profile stats");
			expect(
				screen.queryByRole("heading", { name: "Recent activity" })
			).not.toBeInTheDocument();
		});
	});

	describe("signed-out visitor", () => {
		it("sees the sign-up call to action and a login link instead of Follow", async () => {
			await renderProfile({ data: profile() });

			expect(
				await screen.findByText("Build a library like Ada Lovelace's")
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Join the closed beta" })
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /Follow/ })
			).not.toBeInTheDocument();
		});

		it("does not compare libraries", async () => {
			await renderProfile({ data: profile() });

			await screen.findByLabelText("Profile stats");
			expect(getComparison).not.toHaveBeenCalled();
			expect(
				screen.queryByRole("heading", { name: /In common/ })
			).not.toBeInTheDocument();
		});
	});

	describe("own profile", () => {
		it("offers editing instead of following and hides the sign-up pitch", async () => {
			await renderProfile({
				data: profile(),
				user: { id: "u-ada" }
			});

			expect(
				await screen.findByRole("link", { name: /Edit profile/ })
			).toHaveAttribute("href", "/settings/profile");
			expect(
				screen.queryByRole("button", { name: /Follow/ })
			).not.toBeInTheDocument();
			expect(
				screen.queryByText(/Build a library like/)
			).not.toBeInTheDocument();
		});

		it("does not compare the owner with themselves", async () => {
			await renderProfile({
				data: profile(),
				user: { id: "u-ada" }
			});

			await screen.findByLabelText("Profile stats");
			expect(getComparison).not.toHaveBeenCalled();
		});

		it("keeps the activity section even if the feed is hidden from others", async () => {
			await renderProfile({
				data: profile({
					access: { ...openAccess, feed: false },
					recentActivity: []
				}),
				user: { id: "u-ada" }
			});

			expect(
				await screen.findByText("No recent activity to show.")
			).toBeInTheDocument();
		});
	});

	describe("signed-in visitor", () => {
		const visitor = { id: "u-grace" };

		it("compares the visitor's library with the owner's, completed games first", async () => {
			getComparison.mockReturnValue(
				of({
					inCommon: [
						{
							id: "g1",
							code: "hades",
							title: "Hades",
							backgroundUrl: null
						}
					],
					counts: { inCommon: 7 }
				})
			);
			await renderProfile({ data: profile(), user: visitor });

			expect(
				await screen.findByRole("link", { name: /See all 7/ })
			).toHaveAttribute("href", "/user/ada/in-common?by=completed");
			expect(getComparison).toHaveBeenCalledWith("ada", "completed", {
				limit: 12
			});
		});

		it("tells the visitor the comparison is private when the API denies it", async () => {
			getComparison.mockReturnValue(throwError(() => ({ status: 403 })));
			await renderProfile({ data: profile(), user: visitor });

			expect(
				await screen.findByText(
					"This part of their library is private."
				)
			).toBeInTheDocument();
		});

		it("shows an empty comparison, not a private one, on other errors", async () => {
			getComparison.mockReturnValue(throwError(() => ({ status: 500 })));
			await renderProfile({ data: profile(), user: visitor });

			expect(
				await screen.findByText(/Nothing in common here yet/)
			).toBeInTheDocument();
		});

		it("reloads the comparison for the other dimension", async () => {
			const user = userEvent.setup();
			await renderProfile({ data: profile(), user: visitor });
			await screen.findByRole("radio", { name: "To play" });
			getComparison.mockClear();

			await user.click(screen.getByRole("radio", { name: "To play" }));

			expect(getComparison).toHaveBeenCalledWith("ada", "not_started", {
				limit: 12
			});
		});

		it("follows a public profile and counts the new follower", async () => {
			const user = userEvent.setup();
			follow.mockReturnValue(
				of({ status: "accepted", targetId: "u-ada" })
			);
			await renderProfile({ data: profile(), user: visitor });

			await user.click(
				await screen.findByRole("button", { name: /Follow$/ })
			);

			expect(follow).toHaveBeenCalledWith("ada");
			expect(
				await screen.findByRole("button", { name: /Following/ })
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /4\s*followers/ })
			).toBeInTheDocument();
		});

		it("shows Requested when following needs the owner's approval", async () => {
			const user = userEvent.setup();
			follow.mockReturnValue(
				of({ status: "pending", targetId: "u-ada" })
			);
			await renderProfile({ data: profile(), user: visitor });

			await user.click(
				await screen.findByRole("button", { name: /Follow$/ })
			);

			expect(
				await screen.findByRole("button", { name: /Requested/ })
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /3\s*followers/ })
			).toBeInTheDocument();
		});

		it("asks for confirmation before unfollowing and unfollows once confirmed", async () => {
			const user = userEvent.setup();
			unfollow.mockReturnValue(of({}));
			await renderProfile({
				data: profile({ isFollowing: true }),
				user: visitor
			});

			await user.click(
				await screen.findByRole("button", { name: /Following/ })
			);
			expect(unfollow).not.toHaveBeenCalled();
			expect(
				await screen.findByText("Unfollow @ada?")
			).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Unfollow" }));

			expect(unfollow).toHaveBeenCalledWith("ada");
			expect(
				await screen.findByRole("button", { name: /Follow$/ })
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: /2\s*followers/ })
			).toBeInTheDocument();
			await waitFor(() =>
				expect(
					screen.queryByText("Unfollow @ada?")
				).not.toBeInTheDocument()
			);
		});

		it("keeps following when the visitor cancels the confirmation", async () => {
			const user = userEvent.setup();
			await renderProfile({
				data: profile({ isFollowing: true }),
				user: visitor
			});

			await user.click(
				await screen.findByRole("button", { name: /Following/ })
			);
			await user.click(
				await screen.findByRole("button", { name: "Cancel" })
			);

			expect(unfollow).not.toHaveBeenCalled();
			expect(
				screen.getByRole("button", { name: /Following/ })
			).toBeInTheDocument();
		});

		it("keeps the state when following fails", async () => {
			const user = userEvent.setup();
			follow.mockReturnValue(throwError(() => ({ status: 500 })));
			await renderProfile({ data: profile(), user: visitor });

			await user.click(
				await screen.findByRole("button", { name: /Follow$/ })
			);

			expect(follow).toHaveBeenCalled();
			expect(
				await screen.findByRole("button", { name: /Follow$/ })
			).toBeEnabled();
			expect(
				screen.getByRole("link", { name: /3\s*followers/ })
			).toBeInTheDocument();
		});
	});

	describe("share", () => {
		it("copies the profile link when the browser cannot share", async () => {
			const user = userEvent.setup();
			const writeText = vi.fn().mockResolvedValue(undefined);
			vi.stubGlobal("navigator", {
				...navigator,
				share: undefined,
				clipboard: { writeText }
			});
			await renderProfile({ data: profile() });

			await user.click(
				await screen.findByRole("button", { name: "Share profile" })
			);

			await waitFor(() => expect(writeText).toHaveBeenCalled());
			expect(toast.success).toHaveBeenCalledWith("Profile link copied.");
		});
	});
});
