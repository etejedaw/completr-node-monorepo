import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as usersService from "./users.service";
import * as usersProfileService from "./users-profile.service";
import * as backlogService from "../backlog/backlog.service";
import * as listsService from "../lists/lists.service";
import * as userFollowRequestsService from "../user-follow-requests/user-follow-requests.service";
import * as listFollowersService from "../list-followers/list-followers.service";
import {
	fullProfileSerializer,
	restrictedProfileSerializer,
	userMeSerializer
} from "./users.serializer";
import {
	backlogSerializer,
	backlogPublicSerializer
} from "../backlog/backlog.serializer";
import {
	listSummarySerializer,
	listSerializer
} from "../lists/lists.serializer";
import { UsernameParam, HighlightsQuery } from "./schemas";
import { UpdateUserDto } from "./dtos";
import { UserSearchQuery } from "./schemas/user-search-query.schema";
import { UserDiscoverQuery } from "./schemas/user-discover-query.schema";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";
import * as reviewsService from "../reviews/reviews.service";
import { userReviewSerializer } from "../reviews/reviews.serializer";
import * as userDomain from "./errors/users.domain-error";
import { canView } from "./visibility.helper";

export async function getUserByUsername(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const currentUser = request.locals.user as RequestUser | undefined;

	const profile = await usersProfileService.getProfileByUsername(
		currentUser?.id,
		username
	);

	const data =
		profile.kind === "restricted"
			? restrictedProfileSerializer(profile)
			: fullProfileSerializer(profile);

	return response.status(200).json({ data });
}

export async function getUserMe(request: Request, response: Response) {
	const { id } = request.locals.user as RequestUser;

	const user = await usersService.findUserById(id);
	if (!user) throw userDomain.userNotFound();

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function patchUser(request: Request, response: Response) {
	const updateUserDto = request.locals.body as UpdateUserDto;
	const { id } = request.locals.user as RequestUser;

	const { user, disabledFollowRequests } = await usersService.updateUser(
		id,
		updateUserDto
	);
	if (!user) throw userDomain.userNotFound();

	if (disabledFollowRequests) {
		await userFollowRequestsService.deleteAllIncomingRequests(user.id);
	}

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function deleteUser(request: Request, response: Response) {
	const { id } = request.locals.user as RequestUser;

	await usersService.deactivateUser(id);
	return response.sendStatus(204);
}

export async function searchUsers(request: Request, response: Response) {
	const { q, email, limit } = request.locals.query as UserSearchQuery;

	const users = email
		? await usersService.findUserByExactEmail(email)
		: await usersService.searchUsers(q!, limit);

	const data = {
		users: users.map(u => ({
			id: u.id,
			username: u.username,
			name: u.name,
			avatarUrl: u.avatarUrl,
			profileVisibility: u.profileVisibility
		}))
	};
	return response.status(200).json({ data });
}

export async function getDiscoverUsers(request: Request, response: Response) {
	const { limit } = request.locals.query as UserDiscoverQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const users = await usersService.findRandomPublicUsers(
		limit ?? 12,
		currentUser?.id
	);

	const data = {
		users: users.map(u => ({
			id: u.id,
			username: u.username,
			name: u.name,
			avatarUrl: u.avatarUrl,
			profileVisibility: u.profileVisibility
		}))
	};
	return response.status(200).json({ data });
}

export async function getUserLists(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;
	const isSelf = currentUser?.id === user.id;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomain.userPrivate();
	if (!(await canView(currentUser?.id, user, "list")))
		throw userDomain.userPrivate();

	const lists = isSelf
		? (await listsService.findListsByUserId(currentUser!)).lists
		: await listsService.findPublicListsByUserId(user.id);

	const listsWithFollowers = await Promise.all(
		lists.map(async list => {
			const [count, progress] = await Promise.all([
				listsService.getFollowerCount(list.id),
				listsService.getListProgress(list.id, user.id)
			]);
			return {
				...listSummarySerializer(list),
				followerCount: count,
				progress
			};
		})
	);

	const data = {
		lists: listsWithFollowers,
		total: listsWithFollowers.length
	};
	return response.status(200).json({ data });
}

export async function getUserFollowingLists(
	request: Request,
	response: Response
) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;
	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomain.userPrivate();

	const { rows, total } =
		await listFollowersService.getFollowingListsPaginated(user.id, query);

	const followingLists = rows
		.filter(f => f.isVisible)
		.map(f => listSummarySerializer(f.List));

	const data = { followingLists, total };
	return response.status(200).json({ data });
}

export async function getUserListDetail(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam & { listId: string };

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;
	const isSelf = currentUser?.id === user.id;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomain.userPrivate();

	const list = await listsService.findListById(params.listId);
	if (!list) throw userDomain.userNotFound();
	if (!list.isPublic) throw userDomain.userNotFound();

	const listPlain = list.get({ plain: true });
	const canSeeProgress = await canView(currentUser?.id, user, "backlog");
	const publicOnly = !isSelf;
	const gameIds = (list.ListItems ?? []).map(i => i.gameId);
	const [followerCount, backlogSummaryMap, progress] = await Promise.all([
		listsService.getFollowerCount(params.listId),
		canSeeProgress
			? listsService.getBacklogSummaryMap(gameIds, user.id, publicOnly)
			: Promise.resolve(undefined),
		canSeeProgress
			? listsService.getListProgress(params.listId, user.id, publicOnly)
			: Promise.resolve(null)
	]);

	const data = {
		list: listSerializer(listPlain, {
			followerCount,
			backlogSummaryMap,
			progress
		}),
		profileUser: {
			username: user.username,
			name: user.name
		}
	};
	return response.status(200).json({ data });
}

export async function getUserHighlights(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query as HighlightsQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	const isSelf = currentUser?.id === user.id;
	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomain.userPrivate();
	if (!(await canView(currentUser?.id, user, "backlog")))
		throw userDomain.userPrivate();

	const highlights = await backlogService.findHighlightsByUserId(
		user.id,
		isSelf,
		{ year: query.year, month: query.month }
	);

	const serialize = (entry: (typeof highlights.recent)[number] | null) => {
		if (!entry) return null;
		const plain = entry.get({ plain: true });
		return isSelf
			? backlogSerializer(plain)
			: backlogPublicSerializer(plain);
	};

	const data = {
		highlights: {
			recent: highlights.recent.map(e => serialize(e)!),
			month: {
				startsAt: highlights.month.startsAt,
				endsAt: highlights.month.endsAt,
				completedCount: highlights.month.completedCount,
				mostPlayed: serialize(highlights.month.mostPlayed),
				highestRated: serialize(highlights.month.highestRated)
			}
		}
	};
	return response.status(200).json({ data });
}

export async function getUserCompletions(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query as PaginationQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	const isSelf = currentUser?.id === user.id;
	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomain.userPrivate();
	if (!(await canView(currentUser?.id, user, "backlog")))
		throw userDomain.userPrivate();

	const { rows, total } =
		await backlogService.findCompletionsByUserIdPaginated(user.id, isSelf, {
			limit: query.limit,
			offset: query.offset
		});

	const plainRows = rows.map(r => r.get({ plain: true }));
	const gameIds = plainRows
		.map(r => r.Game?.id)
		.filter((id): id is string => Boolean(id));
	const reviewMap = await reviewsService.findReviewContentByUserAndGameIds(
		user.id,
		gameIds
	);

	const data = {
		completions: plainRows.map(r => {
			const review = r.Game ? (reviewMap.get(r.Game.id) ?? null) : null;
			return isSelf
				? backlogSerializer(r, review)
				: backlogPublicSerializer(r, review);
		}),
		total
	};
	return response.status(200).json({ data });
}

export async function getUserGamesInCommon(
	request: Request,
	response: Response
) {
	const params = request.locals.params as UsernameParam;
	const currentUser = request.locals.user as RequestUser;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	if (user.id === currentUser.id) {
		return response.status(200).json({ data: { games: [], total: 0 } });
	}
	const [okProfile, okBacklog] = await Promise.all([
		canView(currentUser.id, user, "profile"),
		canView(currentUser.id, user, "backlog")
	]);
	if (!okProfile || !okBacklog) throw userDomain.userPrivate();

	const entries = await backlogService.findCommonCompletedGames(
		currentUser.id,
		user.id
	);
	const games = entries.map(entry => ({
		id: entry.Game.id,
		code: entry.Game.code,
		title: entry.Game.title,
		backgroundUrl: entry.Game.backgroundUrl
	}));

	return response.status(200).json({ data: { games, total: games.length } });
}

export async function getUserReviews(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query as PaginationQuery;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;
	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomain.userPrivate();

	const { rows, count } = await reviewsService.findReviewsByUserIdPaginated(
		user.id,
		{ limit: query.limit, offset: query.offset }
	);
	const reviewsPlain = rows.map(r => r.get({ plain: true }));

	const pairs = reviewsPlain
		.filter(r => r.Game)
		.map(r => ({ userId: user.id, gameId: r.Game.id }));
	const durationMap =
		await backlogService.findLatestCompletedDurations(pairs);

	const data = {
		reviews: reviewsPlain.map(r =>
			userReviewSerializer(
				r,
				r.Game
					? (durationMap.get(`${user.id}:${r.Game.id}`) ?? null)
					: null
			)
		),
		total: count
	};
	return response.status(200).json({ data });
}
