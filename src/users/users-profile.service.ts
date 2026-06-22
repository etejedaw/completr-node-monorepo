import * as usersService from "./users.service";
import * as backlogService from "../backlog/backlog.service";
import * as listsService from "../lists/lists.service";
import * as activityService from "../activity/activity.service";
import * as userFollowersService from "../user-followers/user-followers.service";
import * as userFollowRequestsService from "../user-follow-requests/user-follow-requests.service";
import { canView } from "./visibility.helper";
import * as userDomain from "./errors/users.domain-error";
import {
	BacklogStatusCounts,
	FullUserProfile,
	RestrictedUserProfile,
	UserProfileResult
} from "./users.interface";
import { User } from "./user.model";

const EMPTY_BACKLOG_STATS: BacklogStatusCounts = {
	not_started: 0,
	playing: 0,
	completed: 0,
	abandoned: 0,
	endless: 0,
	total: 0
};

export async function getProfileByUsername(
	viewerId: string | undefined,
	username: string
): Promise<UserProfileResult> {
	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomain.userNotFound();

	const isSelf = viewerId === user.id;
	const canViewProfile = await canView(viewerId, user, "profile");

	if (!canViewProfile) return buildRestrictedProfile(viewerId, user);

	return buildFullProfile(viewerId, user, isSelf);
}

async function buildRestrictedProfile(
	viewerId: string | undefined,
	user: User
): Promise<RestrictedUserProfile> {
	const [followerCount, followingCount, isFollowing, hasPendingRequest] =
		await Promise.all([
			userFollowersService.getFollowerCount(user.id),
			userFollowersService.getFollowingCount(user.id),
			viewerId
				? userFollowersService.isFollowing(viewerId, user.id)
				: Promise.resolve(false),
			viewerId
				? userFollowRequestsService.hasOutgoingRequest(
						viewerId,
						user.id
					)
				: Promise.resolve(false)
		]);

	return {
		kind: "restricted",
		user,
		followerCount,
		followingCount,
		isFollowing,
		hasPendingRequest
	};
}

async function buildFullProfile(
	viewerId: string | undefined,
	user: User,
	isSelf: boolean
): Promise<FullUserProfile> {
	const userId = user.id;
	const [canViewBacklog, canViewLists, canViewFeed] = await Promise.all([
		canView(viewerId, user, "backlog"),
		canView(viewerId, user, "list"),
		canView(viewerId, user, "feed")
	]);

	const [
		backlogResult,
		backlogStats,
		listsTotal,
		recentActivity,
		followerCount,
		followingCount,
		isFollowing
	] = await Promise.all([
		loadBacklog(userId, isSelf, canViewBacklog),
		loadBacklogStats(userId, isSelf, canViewBacklog),
		canViewLists
			? listsService.countListsByUserId(userId, !isSelf)
			: Promise.resolve(0),
		canViewFeed
			? activityService.getUserActivity(userId, 10, {
					includeSocial: isSelf
				})
			: Promise.resolve([]),
		userFollowersService.getFollowerCount(userId),
		userFollowersService.getFollowingCount(userId),
		viewerId && !isSelf
			? userFollowersService.isFollowing(viewerId, userId)
			: Promise.resolve(false)
	]);

	return {
		kind: "full",
		user,
		isSelf,
		backlogs: backlogResult.rows.map(b => b.get({ plain: true })),
		backlogTotal: backlogResult.total,
		backlogStats,
		listsTotal,
		recentActivity,
		followerCount,
		followingCount,
		isFollowing
	};
}

async function loadBacklog(
	userId: string,
	isSelf: boolean,
	canViewBacklog: boolean
) {
	if (isSelf) return backlogService.findBacklogByUserId(userId);
	if (canViewBacklog) return backlogService.findPublicBacklogByUserId(userId);
	return { rows: [], total: 0 };
}

async function loadBacklogStats(
	userId: string,
	isSelf: boolean,
	canViewBacklog: boolean
): Promise<BacklogStatusCounts> {
	if (!canViewBacklog) return EMPTY_BACKLOG_STATS;
	return backlogService.countBacklogByStatus(userId, !isSelf);
}
