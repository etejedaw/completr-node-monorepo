import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { PublicSocialService } from "../../core/services/public-social";
import { ToastService } from "../../core/services/toast";
import { type UserResult } from "../../core/services/users.model";
import { injectFollowActions } from "./inject-follow-actions";

function followedUser(): UserResult {
	return {
		id: "user-1",
		username: "ada",
		name: "Ada",
		avatarUrl: null,
		profileVisibility: "public",
		isFollowing: true,
		followerCount: 10
	};
}

describe("injectFollowActions unfollow confirmation", () => {
	const socialService = { unfollow: vi.fn() };
	const toast = { error: vi.fn(), pending: vi.fn() };

	function createActions() {
		return TestBed.runInInjectionContext(() => injectFollowActions());
	}

	beforeEach(() => {
		socialService.unfollow.mockReset();
		toast.error.mockReset();
		toast.pending.mockReset();
		TestBed.configureTestingModule({
			providers: [
				{ provide: PublicSocialService, useValue: socialService },
				{ provide: ToastService, useValue: toast }
			]
		});
	});

	it("asks for confirmation instead of unfollowing right away", () => {
		const actions = createActions();
		const user = followedUser();

		actions.toggleFollow(user);

		expect(actions.unfollowTarget()).toBe(user);
		expect(socialService.unfollow).not.toHaveBeenCalled();
		expect(toast.pending).not.toHaveBeenCalled();
		expect(actions.followStateOf(user)).toBe("following");
	});

	it("leaves everything untouched when the confirmation is cancelled", () => {
		const actions = createActions();
		const user = followedUser();
		actions.toggleFollow(user);

		actions.cancelUnfollow();

		expect(actions.unfollowTarget()).toBeNull();
		expect(socialService.unfollow).not.toHaveBeenCalled();
		expect(actions.followStateOf(user)).toBe("following");
		expect(actions.withLiveCounts(user).followerCount).toBe(10);
	});

	it("unfollows, updates the follower count and closes the dialog when confirmed", () => {
		socialService.unfollow.mockReturnValue(of(null));
		const actions = createActions();
		const user = followedUser();
		actions.toggleFollow(user);

		actions.confirmUnfollow();

		expect(socialService.unfollow).toHaveBeenCalledWith("ada");
		expect(actions.followStateOf(user)).toBe("none");
		expect(actions.withLiveCounts(user).followerCount).toBe(9);
		expect(actions.isBusy(user)).toBe(false);
		expect(actions.unfollowTarget()).toBeNull();
	});

	it("marks the user as busy while the request is in flight and ignores a second confirmation", () => {
		const request = new Subject<null>();
		socialService.unfollow.mockReturnValue(request);
		const actions = createActions();
		const user = followedUser();
		actions.toggleFollow(user);

		actions.confirmUnfollow();
		actions.confirmUnfollow();

		expect(actions.isBusy(user)).toBe(true);
		expect(socialService.unfollow).toHaveBeenCalledTimes(1);
	});

	it("keeps the follow state and the dialog open when the request fails", () => {
		socialService.unfollow.mockReturnValue(
			throwError(() => new Error("network"))
		);
		const actions = createActions();
		const user = followedUser();
		actions.toggleFollow(user);

		actions.confirmUnfollow();

		expect(toast.error).toHaveBeenCalledWith("Could not unfollow @ada.");
		expect(actions.followStateOf(user)).toBe("following");
		expect(actions.withLiveCounts(user).followerCount).toBe(10);
		expect(actions.isBusy(user)).toBe(false);
		expect(actions.unfollowTarget()).toBe(user);
	});
});

describe("injectFollowActions following and requests", () => {
	const socialService = {
		follow: vi.fn(),
		unfollow: vi.fn(),
		cancelFollowRequest: vi.fn()
	};
	const toast = { error: vi.fn(), pending: vi.fn() };

	function createActions() {
		return TestBed.runInInjectionContext(() => injectFollowActions());
	}

	function strangerUser(): UserResult {
		return {
			id: "user-2",
			username: "grace",
			name: "Grace",
			avatarUrl: null,
			profileVisibility: "public",
			isFollowing: false,
			followerCount: 3
		};
	}

	beforeEach(() => {
		for (const fn of Object.values(socialService)) fn.mockReset();
		toast.error.mockReset();
		TestBed.configureTestingModule({
			providers: [
				{ provide: PublicSocialService, useValue: socialService },
				{ provide: ToastService, useValue: toast }
			]
		});
	});

	it("sends a single follow request when the button is clicked twice before the answer", () => {
		const request = new Subject<{ status: string }>();
		socialService.follow.mockReturnValue(request);
		const actions = createActions();
		const user = strangerUser();

		actions.toggleFollow(user);
		actions.toggleFollow(user);
		request.next({ status: "accepted" });
		request.complete();

		expect(socialService.follow).toHaveBeenCalledTimes(1);
		expect(actions.followStateOf(user)).toBe("following");
		expect(actions.withLiveCounts(user).followerCount).toBe(4);
	});

	it("shows Requested without counting a follower when the profile needs approval", () => {
		socialService.follow.mockReturnValue(of({ status: "pending" }));
		const actions = createActions();
		const user = strangerUser();

		actions.toggleFollow(user);

		expect(actions.followStateOf(user)).toBe("requested");
		expect(actions.withLiveCounts(user).followerCount).toBe(3);
	});

	it("starts as requested when the subject already has a pending request", () => {
		const actions = createActions();

		expect(
			actions.followStateOf({
				...strangerUser(),
				hasPendingRequest: true
			})
		).toBe("requested");
	});

	it("keeps the user unfollowed and explains the failure when following fails", () => {
		socialService.follow.mockReturnValue(
			throwError(() => ({ status: 500 }))
		);
		const actions = createActions();
		const user = strangerUser();

		actions.toggleFollow(user);

		expect(toast.error).toHaveBeenCalledWith("Could not follow @grace.");
		expect(actions.followStateOf(user)).toBe("none");
		expect(actions.isBusy(user)).toBe(false);
	});

	it("cancels a pending request once and keeps it when cancelling fails", () => {
		socialService.cancelFollowRequest.mockReturnValue(
			throwError(() => ({ status: 500 }))
		);
		const actions = createActions();
		const user = { ...strangerUser(), hasPendingRequest: true };

		actions.toggleFollow(user);
		actions.toggleFollow(user);

		expect(socialService.cancelFollowRequest).toHaveBeenCalledTimes(2);
		expect(toast.error).toHaveBeenCalledWith(
			"Could not cancel your request to @grace."
		);
		expect(actions.followStateOf(user)).toBe("requested");
	});
});
