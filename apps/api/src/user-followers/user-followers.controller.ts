import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as userFollowRequestsService from "../user-follow-requests/user-follow-requests.service";
import { type UsernameParam } from "../users/schemas/username-params.schema";
import { userCardSerializer } from "../users/users.serializer";
import * as usersProfileService from "../users/users-profile.service";
import * as userFollowersService from "./user-followers.service";

export async function postFollow(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const user = request.locals.user as RequestUser;

	const result = await userFollowRequestsService.createOrAcceptFollow(
		user.id,
		username
	);

	if (result.status === "accepted") {
		activityService.record(user.id, "user_followed", result.targetId);
		activityService.record(result.targetId, "user_followed_by", user.id);
	}

	return response
		.status(201)
		.json({ data: { status: result.status, targetId: result.targetId } });
}

export async function deleteFollow(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const user = request.locals.user as RequestUser;

	await userFollowersService.unfollow(user.id, username);
	return response.sendStatus(204);
}

export async function getFollowers(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const query = request.locals.query as PaginatedSearchQuery;
	const viewer = request.locals.user as RequestUser | undefined;

	const { cards, total } =
		await usersProfileService.getConnectionCardsForUsername(
			viewer?.id,
			username,
			"followers",
			query
		);

	return response
		.status(200)
		.json({ data: { users: cards.map(userCardSerializer), total } });
}

export async function getFollowing(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const query = request.locals.query as PaginatedSearchQuery;
	const viewer = request.locals.user as RequestUser | undefined;

	const { cards, total } =
		await usersProfileService.getConnectionCardsForUsername(
			viewer?.id,
			username,
			"following",
			query
		);

	return response
		.status(200)
		.json({ data: { users: cards.map(userCardSerializer), total } });
}
