import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { ListIdParams } from "../lists/schemas/list-id-params.schema";
import { UpdateFollowVisibilityBody } from "./schemas/update-follow-visibility.schema";
import { listSummarySerializer } from "../lists/lists.serializer";
import * as listFollowersService from "./list-followers.service";
import * as listsService from "../lists/lists.service";
import * as activityService from "../activity/activity.service";

export async function postFollow(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	await listFollowersService.followList(params.listId, user.id);
	activityService.record(user.id, "list_followed", params.listId);
	return response.sendStatus(201);
}

export async function deleteFollow(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	await listFollowersService.unfollowList(params.listId, user.id);
	return response.sendStatus(204);
}

export async function getFollowers(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;

	const followers = await listFollowersService.getListFollowers(
		params.listId
	);
	const users = followers.map(f => f.User);

	return response.status(200).json({ data: { users } });
}

export async function getFollowing(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const entries = await listFollowersService.getFollowingLists(user.id);
	const lists = await Promise.all(
		entries.map(async e => {
			const progress = await listsService.getListProgress(
				e.listId,
				user.id
			);
			return {
				...listSummarySerializer(e.List),
				isVisible: e.isVisible,
				progress
			};
		})
	);

	return response.status(200).json({ data: { lists } });
}

export async function patchVisibility(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const body = request.locals.body as UpdateFollowVisibilityBody;
	const user = request.locals.user as RequestUser;

	await listFollowersService.updateVisibility(
		params.listId,
		user.id,
		body.isVisible
	);

	return response.sendStatus(204);
}
