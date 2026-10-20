import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { ToastService } from "../../core/services/toast";
import { type UserResult } from "../../core/services/users";
import { PublicSocialService } from "../public-profile/services/public-social.service";
import { injectFollowActions } from "./follow-actions";

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
