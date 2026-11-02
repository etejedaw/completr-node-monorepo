import { inject, signal } from "@angular/core";

import { ToastService } from "../../core/services/toast";
import { type UserResult } from "../../core/services/users.model";
import { PublicSocialService } from "../public-profile/services/public-social.service";
import { type FollowState } from "./user-card/user-card";

export function injectFollowActions() {
	const socialService = inject(PublicSocialService);
	const toast = inject(ToastService);

	const followOverrides = signal<Record<string, FollowState>>({});
	const followerDeltas = signal<Record<string, number>>({});
	const busyIds = signal<Set<string>>(new Set());
	const unfollowTarget = signal<UserResult | null>(null);

	const setFollowState = (userId: string, state: FollowState) =>
		followOverrides.update(overrides => ({
			...overrides,
			[userId]: state
		}));

	const adjustFollowers = (userId: string, delta: number) =>
		followerDeltas.update(deltas => ({
			...deltas,
			[userId]: (deltas[userId] ?? 0) + delta
		}));

	const setBusy = (userId: string, busy: boolean) =>
		busyIds.update(ids => {
			const next = new Set(ids);
			if (busy) next.add(userId);
			else next.delete(userId);
			return next;
		});

	const followStateOf = (user: UserResult): FollowState =>
		followOverrides()[user.id] ?? (user.isFollowing ? "following" : "none");

	const withLiveCounts = (user: UserResult): UserResult => {
		const delta = followerDeltas()[user.id] ?? 0;
		if (
			!delta ||
			user.followerCount === null ||
			user.followerCount === undefined
		)
			return user;
		return { ...user, followerCount: user.followerCount + delta };
	};

	const isBusy = (user: UserResult) => busyIds().has(user.id);

	const follow = (user: UserResult) => {
		setBusy(user.id, true);
		socialService.follow(user.username).subscribe({
			next: result => {
				const accepted = result.status === "accepted";
				setFollowState(user.id, accepted ? "following" : "requested");
				if (accepted) adjustFollowers(user.id, 1);
				setBusy(user.id, false);
			},
			error: () => {
				setBusy(user.id, false);
				toast.error(`Could not follow @${user.username}.`);
			}
		});
	};

	const cancelRequest = (user: UserResult) => {
		setBusy(user.id, true);
		socialService.cancelFollowRequest(user.username).subscribe({
			next: () => {
				setFollowState(user.id, "none");
				setBusy(user.id, false);
			},
			error: () => setBusy(user.id, false)
		});
	};

	const cancelUnfollow = () => unfollowTarget.set(null);

	const confirmUnfollow = () => {
		const user = unfollowTarget();
		if (!user || isBusy(user)) return;
		setBusy(user.id, true);
		socialService.unfollow(user.username).subscribe({
			next: () => {
				setFollowState(user.id, "none");
				adjustFollowers(user.id, -1);
				setBusy(user.id, false);
				cancelUnfollow();
			},
			error: () => {
				setBusy(user.id, false);
				toast.error(`Could not unfollow @${user.username}.`);
			}
		});
	};

	const toggleFollow = (user: UserResult) => {
		const state = followStateOf(user);
		if (state === "following") unfollowTarget.set(user);
		else if (state === "requested") cancelRequest(user);
		else follow(user);
	};

	return {
		followStateOf,
		withLiveCounts,
		isBusy,
		toggleFollow,
		unfollowTarget: unfollowTarget.asReadonly(),
		confirmUnfollow,
		cancelUnfollow
	};
}
