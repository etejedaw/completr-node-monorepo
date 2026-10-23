import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { listSummarySerializer } from "../lists/lists.serializer";
import * as listsService from "../lists/lists.service";
import { type ListIdParams } from "../lists/schemas/list-id-params.schema";
import * as listFollowersService from "./list-followers.service";
import { type UpdateFollowVisibilityDto } from "./update-follow-visibility.dto";

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
	const user = request.locals.user as RequestUser;

	const followers = await listFollowersService.getListFollowers(
		params.listId,
		user.id
	);
	const users = followers.map(f => f.User);

	return response.status(200).json({ data: { users } });
}

export async function getFollowing(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const entries = await listFollowersService.getFollowingLists(user.id);
	const progressByList = await listsService.getListsProgress(
		entries.map(e => e.listId),
		user.id
	);
	const lists = entries.map(e => ({
		...listSummarySerializer(e.List),
		isVisible: e.isVisible,
		progress: progressByList.get(e.listId) ?? { completed: 0, total: 0 }
	}));

	return response.status(200).json({ data: { lists } });
}

export async function patchVisibility(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const body = request.locals.body as UpdateFollowVisibilityDto;
	const user = request.locals.user as RequestUser;

	await listFollowersService.updateVisibility(
		params.listId,
		user.id,
		body.isVisible
	);

	return response.sendStatus(204);
}
