import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginationQuery } from "../common/schemas/pagination-query.schema";
import * as favoritesService from "../favorites/favorites.service";
import * as franchiseService from "../franchises/franchises.service";
import * as gameShelfService from "../game-shelf/game-shelf.service";
import * as listFollowersService from "../list-followers/list-followers.service";
import * as listsService from "../lists/lists.service";
import * as reviewsService from "../reviews/reviews.service";
import * as userFollowRequestsService from "../user-follow-requests/user-follow-requests.service";
import * as userFollowersService from "../user-followers/user-followers.service";
import * as wishlistService from "../wishlist/wishlist.service";
import { type VisibilitySection } from "./constants/visibility.constants";
import * as userDomain from "./errors/users.domain-error";
import { canView } from "./helpers/visibility.helper";
import { type ComparisonDimension } from "./schemas/comparison-query.schema";
import { type User } from "./user.model";
import {
	type BacklogStatusCounts,
	type ComparisonGameEntry,
	type FullUserProfile,
	type RestrictedUserProfile,
	type UserComparisonBundle,
	type UserCompletionsBundle,
	type UserFollowingListsBundle,
	type UserFranchisesBundle,
	type UserHighlightsBundle,
	type UserListDetailBundle,
	type UserListsBundle,
	type UserProfileResult,
	type UserReviewsBundle
} from "./users.interface";
import * as usersService from "./users.service";

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

const PROFILE_BACKLOG_PREVIEW = 6;

async function loadBacklog(
	userId: string,
	isSelf: boolean,
	canViewBacklog: boolean
) {
	const filters = { limit: PROFILE_BACKLOG_PREVIEW };
	if (isSelf) return backlogService.findBacklogByUserId(userId, filters);
	if (canViewBacklog)
		return backlogService.findPublicBacklogByUserId(userId, filters);
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

async function requireVisibleUser(
	viewerId: string | undefined,
	username: string,
	sections: VisibilitySection[]
): Promise<User> {
	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomain.userNotFound();

	for (const section of sections) {
		if (!(await canView(viewerId, user, section)))
			throw userDomain.userPrivate();
	}
	return user;
}

export async function getListsForUsername(
	viewer: RequestUser | undefined,
	username: string
): Promise<UserListsBundle> {
	const user = await requireVisibleUser(viewer?.id, username, [
		"profile",
		"list"
	]);
	const isSelf = viewer?.id === user.id;

	const lists =
		isSelf && viewer
			? (await listsService.findListsByUserId(viewer)).lists
			: await listsService.findPublicListsByUserId(user.id);

	const enriched = await Promise.all(
		lists.map(async list => {
			const [followerCount, progress] = await Promise.all([
				listsService.getFollowerCount(list.id),
				listsService.getListProgress(list.id, user.id)
			]);
			return { list, followerCount, progress };
		})
	);

	return { lists: enriched, total: enriched.length };
}

export async function getFollowingListsForUsername(
	viewerId: string | undefined,
	username: string,
	query: PaginationQuery
): Promise<UserFollowingListsBundle> {
	const user = await requireVisibleUser(viewerId, username, ["profile"]);

	const { rows, total } =
		await listFollowersService.getFollowingListsPaginated(user.id, query);

	const followingLists = rows.filter(f => f.isVisible).map(f => f.List);
	return { followingLists, total };
}

export async function getListDetailForUsername(
	viewerId: string | undefined,
	username: string,
	listId: string
): Promise<UserListDetailBundle> {
	const user = await requireVisibleUser(viewerId, username, ["profile"]);
	const isSelf = viewerId === user.id;

	const list = await listsService.findListById(listId);
	if (!list || (!list.isPublic && list.userId !== viewerId))
		throw userDomain.userNotFound();

	const listPlain = list.get({ plain: true });
	const canSeeProgress = await canView(viewerId, user, "backlog");
	const publicOnly = !isSelf;
	const gameIds = (list.ListItems ?? []).map(i => i.gameId);

	const [followerCount, backlogSummaryMap, progress] = await Promise.all([
		listsService.getFollowerCount(listId),
		canSeeProgress
			? listsService.getBacklogSummaryMap(gameIds, user.id, publicOnly)
			: Promise.resolve(undefined),
		canSeeProgress
			? listsService.getListProgress(listId, user.id, publicOnly)
			: Promise.resolve(null)
	]);

	return {
		profileUser: { username: user.username, name: user.name },
		listPlain,
		aggregates: { followerCount, backlogSummaryMap, progress }
	};
}

export async function getHighlightsForUsername(
	viewerId: string | undefined,
	username: string,
	options: { year?: number; month?: number }
): Promise<UserHighlightsBundle> {
	const user = await requireVisibleUser(viewerId, username, [
		"profile",
		"backlog"
	]);
	const isSelf = viewerId === user.id;

	const highlights = await backlogService.findHighlightsByUserId(
		user.id,
		isSelf,
		options
	);
	return { isSelf, highlights };
}

export async function getCompletionsForUsername(
	viewerId: string | undefined,
	username: string,
	pagination: PaginationQuery
): Promise<UserCompletionsBundle> {
	const user = await requireVisibleUser(viewerId, username, [
		"profile",
		"backlog"
	]);
	const isSelf = viewerId === user.id;

	const { rows, total } =
		await backlogService.findCompletionsByUserIdPaginated(user.id, isSelf, {
			limit: pagination.limit,
			offset: pagination.offset
		});

	const plainRows = rows.map(r => r.get({ plain: true }));
	const gameIds = plainRows
		.map(r => r.Game?.id)
		.filter((id): id is string => Boolean(id));
	const reviewMap = await reviewsService.findReviewContentByUserAndGameIds(
		user.id,
		gameIds
	);

	return { isSelf, rows: plainRows, reviewMap, total };
}

const COMPARISON_SECTION: Record<ComparisonDimension, VisibilitySection> = {
	completed: "backlog",
	playing: "backlog",
	not_started: "backlog",
	shelf: "shelf",
	favorites: "favorite",
	wishlist: "wishlist"
};

type GameEntryRow = {
	gameId: string;
	Game?: {
		id: string;
		code: string;
		title: string;
		backgroundUrl?: string | null;
	};
};

function loadComparisonEntries(
	userId: string,
	by: ComparisonDimension,
	publicOnly: boolean,
	gameIds?: string[]
): Promise<GameEntryRow[]> {
	switch (by) {
		case "completed":
		case "playing":
		case "not_started":
			return backlogService.findGameEntriesByStatus(
				userId,
				by,
				publicOnly,
				gameIds
			);
		case "shelf":
			return gameShelfService.findGameEntriesByUserId(
				userId,
				publicOnly,
				gameIds
			);
		case "favorites":
			return favoritesService.findGameEntriesByUserId(userId, gameIds);
		case "wishlist":
			return wishlistService.findGameEntriesByUserId(userId, gameIds);
	}
}

function toEntryMap(rows: GameEntryRow[]): Map<string, ComparisonGameEntry> {
	const map = new Map<string, ComparisonGameEntry>();
	for (const row of rows) {
		if (!row.Game || map.has(row.gameId)) continue;
		map.set(row.gameId, {
			id: row.Game.id,
			code: row.Game.code,
			title: row.Game.title,
			backgroundUrl: row.Game.backgroundUrl
		});
	}
	return map;
}

const EMPTY_COMPARISON = (by: ComparisonDimension): UserComparisonBundle => ({
	by,
	inCommon: [],
	onlyViewer: [],
	onlyTarget: [],
	counts: { inCommon: 0, onlyViewer: 0, onlyTarget: 0 }
});

export interface ComparisonOptions {
	includeOnlyTarget: boolean;
	includeOnlyViewer: boolean;
	limit?: number;
	offset: number;
}

function paginate(
	entries: ComparisonGameEntry[],
	limit: number | undefined,
	offset: number
): ComparisonGameEntry[] {
	if (limit === undefined && offset === 0) return entries;
	const end = limit === undefined ? undefined : offset + limit;
	return entries.slice(offset, end);
}

export async function getComparisonForUsername(
	viewer: RequestUser,
	username: string,
	by: ComparisonDimension,
	options: ComparisonOptions
): Promise<UserComparisonBundle> {
	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomain.userNotFound();

	if (user.id === viewer.id) return EMPTY_COMPARISON(by);

	const section = COMPARISON_SECTION[by];
	const [okProfile, okSection] = await Promise.all([
		canView(viewer.id, user, "profile"),
		canView(viewer.id, user, section)
	]);
	if (!okProfile || !okSection) throw userDomain.userPrivate();

	const viewerMap = toEntryMap(
		await loadComparisonEntries(viewer.id, by, false)
	);
	const viewerGameIds = [...viewerMap.keys()];

	const targetMap = await loadTargetMap(user.id, by, viewerGameIds, options);

	const inCommon: ComparisonGameEntry[] = [];
	const onlyViewer: ComparisonGameEntry[] = [];
	for (const [gameId, entry] of viewerMap) {
		if (targetMap.has(gameId)) inCommon.push(entry);
		else if (options.includeOnlyViewer) onlyViewer.push(entry);
	}

	const onlyTarget: ComparisonGameEntry[] = [];
	if (options.includeOnlyTarget) {
		for (const [gameId, entry] of targetMap) {
			if (!viewerMap.has(gameId)) onlyTarget.push(entry);
		}
	}

	const { limit, offset } = options;
	return {
		by,
		inCommon: paginate(inCommon, limit, offset),
		onlyViewer: paginate(onlyViewer, limit, offset),
		onlyTarget: paginate(onlyTarget, limit, offset),
		counts: {
			inCommon: inCommon.length,
			onlyViewer: onlyViewer.length,
			onlyTarget: onlyTarget.length
		}
	};
}

async function loadTargetMap(
	targetId: string,
	by: ComparisonDimension,
	viewerGameIds: string[],
	options: ComparisonOptions
): Promise<Map<string, ComparisonGameEntry>> {
	// onlyTarget needs the target's full set; otherwise restrict the query to
	// the viewer's games — enough for inCommon and onlyViewer, and far cheaper.
	if (options.includeOnlyTarget) {
		return toEntryMap(await loadComparisonEntries(targetId, by, true));
	}
	if (viewerGameIds.length === 0) return new Map();
	return toEntryMap(
		await loadComparisonEntries(targetId, by, true, viewerGameIds)
	);
}

const FRANCHISE_PROGRESS_STATUSES = ["completed", "abandoned", "endless"];

export async function getFranchisesForUsername(
	viewer: RequestUser | undefined,
	username: string
): Promise<UserFranchisesBundle> {
	const user = await requireVisibleUser(viewer?.id, username, [
		"profile",
		"backlog"
	]);
	const isSelf = viewer?.id === user.id;

	const [trackedFranchiseIds, completedGameIds] = await Promise.all([
		franchiseService.findTrackedFranchiseIds(user.id),
		backlogService.findDistinctGameIdsByUserAndStatuses(
			user.id,
			FRANCHISE_PROGRESS_STATUSES,
			!isSelf
		)
	]);
	const franchises = await franchiseService.findTrackedFranchiseProgress(
		trackedFranchiseIds,
		completedGameIds
	);

	return { franchises, total: franchises.length };
}

export async function getReviewsForUsername(
	viewerId: string | undefined,
	username: string,
	pagination: PaginationQuery
): Promise<UserReviewsBundle> {
	const user = await requireVisibleUser(viewerId, username, ["profile"]);

	const { rows, count } = await reviewsService.findReviewsByUserIdPaginated(
		user.id,
		{ limit: pagination.limit, offset: pagination.offset }
	);
	const reviewsPlain = rows.map(r => r.get({ plain: true }));

	const pairs = reviewsPlain
		.filter(r => r.Game)
		.map(r => ({ userId: user.id, gameId: r.Game.id }));
	const durationMap =
		await backlogService.findLatestCompletedDurations(pairs);

	return { user, reviewsPlain, durationMap, total: count };
}
