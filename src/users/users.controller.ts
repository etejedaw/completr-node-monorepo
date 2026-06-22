import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as usersService from "./users.service";
import * as usersProfileService from "./users-profile.service";
import * as userFollowRequestsService from "../user-follow-requests/user-follow-requests.service";
import {
	enrichedUserListSerializer,
	fullProfileSerializer,
	restrictedProfileSerializer,
	userCompletionsSerializer,
	userHighlightsSerializer,
	userMeSerializer,
	userReviewsSerializer,
	userSummarySerializer
} from "./users.serializer";
import {
	listSerializer,
	listSummarySerializer
} from "../lists/lists.serializer";
import { UsernameParam, HighlightsQuery } from "./schemas";
import { UpdateUserDto } from "./dtos";
import { UserSearchQuery } from "./schemas/user-search-query.schema";
import { UserDiscoverQuery } from "./schemas/user-discover-query.schema";
import { PaginationQuery } from "../common/schemas/pagination-query.schema";
import * as userDomain from "./errors/users.domain-error";

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

	const data = { users: users.map(userSummarySerializer) };
	return response.status(200).json({ data });
}

export async function getDiscoverUsers(request: Request, response: Response) {
	const { limit } = request.locals.query as UserDiscoverQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const users = await usersService.findRandomPublicUsers(
		limit ?? 12,
		currentUser?.id
	);

	const data = { users: users.map(userSummarySerializer) };
	return response.status(200).json({ data });
}

export async function getUserLists(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const currentUser = request.locals.user as RequestUser | undefined;

	const bundle = await usersProfileService.getListsForUsername(
		currentUser,
		username
	);

	const data = {
		lists: bundle.lists.map(enrichedUserListSerializer),
		total: bundle.total
	};
	return response.status(200).json({ data });
}

export async function getUserFollowingLists(
	request: Request,
	response: Response
) {
	const { username } = request.locals.params as UsernameParam;
	const query = (request.locals.query ?? {}) as PaginationQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const bundle = await usersProfileService.getFollowingListsForUsername(
		currentUser?.id,
		username,
		query
	);

	const data = {
		followingLists: bundle.followingLists.map(listSummarySerializer),
		total: bundle.total
	};
	return response.status(200).json({ data });
}

export async function getUserListDetail(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam & { listId: string };
	const currentUser = request.locals.user as RequestUser | undefined;

	const bundle = await usersProfileService.getListDetailForUsername(
		currentUser?.id,
		params.username,
		params.listId
	);

	const data = {
		list: listSerializer(bundle.listPlain, bundle.aggregates),
		profileUser: bundle.profileUser
	};
	return response.status(200).json({ data });
}

export async function getUserHighlights(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const query = request.locals.query as HighlightsQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const bundle = await usersProfileService.getHighlightsForUsername(
		currentUser?.id,
		username,
		{ year: query.year, month: query.month }
	);

	return response
		.status(200)
		.json({ data: userHighlightsSerializer(bundle) });
}

export async function getUserCompletions(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const query = request.locals.query as PaginationQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const bundle = await usersProfileService.getCompletionsForUsername(
		currentUser?.id,
		username,
		query
	);

	return response
		.status(200)
		.json({ data: userCompletionsSerializer(bundle) });
}

export async function getUserGamesInCommon(
	request: Request,
	response: Response
) {
	const { username } = request.locals.params as UsernameParam;
	const currentUser = request.locals.user as RequestUser;

	const bundle = await usersProfileService.getGamesInCommonForUsername(
		currentUser,
		username
	);

	return response.status(200).json({ data: bundle });
}

export async function getUserReviews(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const query = request.locals.query as PaginationQuery;
	const currentUser = request.locals.user as RequestUser | undefined;

	const bundle = await usersProfileService.getReviewsForUsername(
		currentUser?.id,
		username,
		query
	);

	return response.status(200).json({ data: userReviewsSerializer(bundle) });
}
