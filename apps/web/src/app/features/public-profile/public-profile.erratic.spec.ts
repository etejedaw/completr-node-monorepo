import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { ActivatedRoute, provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { BehaviorSubject, of, Subject, throwError } from "rxjs";

import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { GiftOffersService } from "../../shared/components/gift-offer-card/gift-offers.service";
import { FeedService } from "../feed/feed";
import { RewindService } from "../rewind/rewind";
import { PublicProfileComponent } from "./public-profile";
import {
	type ProfileSectionAccess,
	type PublicProfile
} from "./public-profile.model";
import { PublicProfileService } from "./public-profile.service";
import { PublicLibraryService } from "./services/public-library.service";
import { PublicListsService } from "./services/public-lists.service";
import { PublicReviewsService } from "./services/public-reviews.service";
import { PublicSocialService } from "./services/public-social.service";

const favoritesOnly: ProfileSectionAccess = {
	profile: true,
	queue: false,
	wishlist: false,
	favorite: true,
	feed: true,
	backlog: false,
	shelf: false,
	list: false,
	platinum: false,
	franchise: false,
	rewind: false
};

const backlogOnly: ProfileSectionAccess = {
	...favoritesOnly,
	favorite: false,
	backlog: true
};

function userProfile(
	username: string,
	overrides: Partial<PublicProfile> = {}
): PublicProfile {
	return {
		user: {
			id: `u-${username}`,
			username,
			name: username,
			role: "user",
			createdAt: "2025-03-15T00:00:00.000Z"
		},
		followerCount: 3,
		followingCount: 5,
		isFollowing: false,
		backlogs: [],
		backlogTotal: 0,
		listsTotal: 0,
		recentActivity: [],
		access: favoritesOnly,
		...overrides
	} as PublicProfile;
}

function favoriteOf(title: string) {
	return {
		id: `fav-${title}`,
		position: 1,
		game: {
			id: `g-${title}`,
			title,
			code: title.toLowerCase(),
			backgroundUrl: null
		}
	};
}

function highlights(completedCount: number) {
	return {
		recent: [],
		month: {
			startsAt: "2026-02-01T00:00:00.000Z",
			endsAt: "2026-02-28T00:00:00.000Z",
			completedCount,
			longestPlayed: null,
			bestPersonalRatio: null,
			highestRated: null
		}
	};
}

describe("PublicProfileComponent with unpredictable traffic", () => {
	const authUser = signal<{ id: string } | null>(null);
	const routeParams = new BehaviorSubject<{ get: () => string }>({
		get: () => "ada"
	});
	const getProfile = vi.fn();
	const getUserFavorites = vi.fn();
	const getHighlights = vi.fn();
	const deleteActivity = vi.fn();
	const toast = {
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
		pending: vi.fn()
	};

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
		routeParams.next({ get: () => "ada" });
		authUser.set(null);
		for (const fn of [
			getProfile,
			getUserFavorites,
			getHighlights,
			deleteActivity,
			toast.success,
			toast.warning,
			toast.error,
			toast.pending
		]) {
			fn.mockReset();
		}
		getUserFavorites.mockReturnValue(of({ items: [], total: 0 }));
		getHighlights.mockReturnValue(of(highlights(0)));
		deleteActivity.mockReturnValue(of({}));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function renderProfile() {
		return render(PublicProfileComponent, {
			providers: [
				provideRouter([]),
				{
					provide: ActivatedRoute,
					useValue: {
						snapshot: { queryParamMap: { get: () => null } },
						paramMap: routeParams
					}
				},
				{
					provide: AuthService,
					useValue: {
						token: () => null,
						user: authUser,
						isLoggedIn: signal(true),
						loadUser: vi.fn(() => of(null))
					}
				},
				{ provide: ToastService, useValue: toast },
				{
					provide: GiftOffersService,
					useValue: {
						listOffers: vi.fn(() => of([])),
						claimOffer: vi.fn(),
						invalidate: vi.fn()
					}
				},
				{ provide: FeedService, useValue: { deleteActivity } },
				{ provide: PublicProfileService, useValue: { getProfile } },
				{
					provide: RewindService,
					useValue: {
						getYears: vi.fn(() =>
							of({ spotlightYear: null, years: [] })
						)
					}
				},
				{
					provide: PublicSocialService,
					useValue: {
						follow: vi.fn(),
						unfollow: vi.fn(),
						cancelFollowRequest: vi.fn()
					}
				},
				{
					provide: PublicLibraryService,
					useValue: {
						getUserFavorites,
						getUserPlatinums: vi.fn(() =>
							of({ items: [], total: 0 })
						),
						getUserQueue: vi.fn(() => of({ items: [], total: 0 })),
						getUserFranchises: vi.fn(() => of([])),
						getComparison: vi.fn(() =>
							of({ inCommon: [], counts: { inCommon: 0 } })
						)
					}
				},
				{
					provide: PublicReviewsService,
					useValue: {
						getUserReviews: vi.fn(() =>
							of({ reviews: [], total: 0 })
						),
						getHighlights
					}
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

	it("offers a retry instead of a blank page when the profile request fails", async () => {
		const user = userEvent.setup();
		getProfile.mockReturnValueOnce(throwError(() => ({ status: 500 })));
		getProfile.mockReturnValue(of(userProfile("ada")));
		await renderProfile();

		await user.click(
			await screen.findByRole("button", { name: "Try again" })
		);

		expect(
			await screen.findByRole("region", { name: "ada profile" })
		).toBeInTheDocument();
		expect(getProfile).toHaveBeenCalledTimes(2);
	});

	it("shows a dropped connection as a load failure, not as a missing player", async () => {
		getProfile.mockReturnValue(throwError(() => ({ status: 0 })));
		await renderProfile();

		expect(
			await screen.findByText("Couldn't load this profile")
		).toBeInTheDocument();
		expect(screen.queryByText("Player not found")).not.toBeInTheDocument();
	});

	it("never shows the sections of the previous player when a slow answer arrives after navigating", async () => {
		const slowAdaFavorites = new Subject<{
			items: ReturnType<typeof favoriteOf>[];
			total: number;
		}>();
		getProfile.mockImplementation((name: string) => of(userProfile(name)));
		getUserFavorites.mockImplementation((name: string) =>
			name === "ada"
				? slowAdaFavorites
				: of({ items: [favoriteOf("Celeste")], total: 1 })
		);
		await renderProfile();
		await screen.findByRole("region", { name: "ada profile" });

		routeParams.next({ get: () => "grace" });
		expect(
			await screen.findByRole("region", { name: "grace profile" })
		).toBeInTheDocument();
		slowAdaFavorites.next({ items: [favoriteOf("Hades")], total: 1 });
		slowAdaFavorites.complete();

		await waitFor(() =>
			expect(screen.queryByText("Hades")).not.toBeInTheDocument()
		);
		expect(getUserFavorites).toHaveBeenCalledWith(
			"grace",
			expect.anything()
		);
	});

	it("ignores the profile of the previous player when it answers after the new one", async () => {
		const slowAda = new Subject<PublicProfile>();
		getProfile.mockImplementation((name: string) =>
			name === "ada" ? slowAda : of(userProfile(name))
		);
		await renderProfile();

		routeParams.next({ get: () => "grace" });
		expect(
			await screen.findByRole("region", { name: "grace profile" })
		).toBeInTheDocument();
		slowAda.next(userProfile("ada"));
		slowAda.complete();

		await waitFor(() =>
			expect(
				screen.queryByRole("region", { name: "ada profile" })
			).not.toBeInTheDocument()
		);
		expect(
			screen.getByRole("region", { name: "grace profile" })
		).toBeInTheDocument();
	});

	it("keeps showing the current month while the previous one loads and ignores a double click", async () => {
		const user = userEvent.setup();
		const previousMonth = new Subject<ReturnType<typeof highlights>>();
		getProfile.mockReturnValue(
			of(userProfile("ada", { access: backlogOnly }))
		);
		getHighlights.mockReset();
		getHighlights.mockReturnValueOnce(of(highlights(1)));
		getHighlights.mockReturnValue(previousMonth);
		await renderProfile();
		const previous = await screen.findByRole("button", {
			name: "Previous month"
		});

		await user.dblClick(previous);

		expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
		expect(getHighlights).toHaveBeenCalledTimes(2);
		previousMonth.next(highlights(22));
		previousMonth.complete();
		expect(await screen.findByText(/22/)).toBeInTheDocument();
	});

	describe("removing an activity", () => {
		const activity = (id: string) => ({
			id,
			type: "backlog_completed",
			createdAt: "2026-02-01T00:00:00.000Z",
			target: null,
			game: {
				type: "game",
				id: `g-${id}`,
				name: `Game ${id}`,
				code: id,
				backgroundUrl: null
			}
		});

		async function renderOwnProfile() {
			authUser.set({ id: "u-ada" });
			getProfile.mockReturnValue(
				of(
					userProfile("ada", {
						recentActivity: [
							activity("a1"),
							activity("a2")
						] as PublicProfile["recentActivity"]
					})
				)
			);
			await renderProfile();
			await screen.findByRole("region", { name: "ada profile" });
		}

		function removeButtons() {
			return screen.getAllByRole("button", {
				name: "Remove this activity"
			});
		}

		function pendingRemoval(index: number) {
			return toast.pending.mock.calls[index][0] as {
				onCommit: () => void;
				onUndo: () => void;
			};
		}

		it("treats an activity that no longer exists as already removed", async () => {
			const user = userEvent.setup();
			deleteActivity.mockReturnValue(throwError(() => ({ status: 404 })));
			await renderOwnProfile();

			await user.click(removeButtons()[0]);
			pendingRemoval(0).onCommit();

			expect(deleteActivity).toHaveBeenCalledWith("a1");
			expect(toast.warning).not.toHaveBeenCalled();
			expect(screen.queryByText("Game a1")).not.toBeInTheDocument();
		});

		it("puts the activity back and warns when the server fails", async () => {
			const user = userEvent.setup();
			deleteActivity.mockReturnValue(throwError(() => ({ status: 500 })));
			await renderOwnProfile();

			await user.click(removeButtons()[0]);
			pendingRemoval(0).onCommit();

			expect(toast.warning).toHaveBeenCalledWith(
				"Could not remove the activity."
			);
			expect(await screen.findAllByLabelText("Game a1")).not.toHaveLength(
				0
			);
		});

		it("undoes only the activity that was undone when two were removed in a row", async () => {
			const user = userEvent.setup();
			await renderOwnProfile();

			await user.click(removeButtons()[0]);
			await user.click(removeButtons()[0]);
			pendingRemoval(0).onUndo();

			expect(await screen.findAllByLabelText("Game a1")).not.toHaveLength(
				0
			);
			expect(screen.queryAllByLabelText("Game a2")).toHaveLength(0);
		});
	});
});
