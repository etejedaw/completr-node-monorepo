import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { ListIdParams } from "../lists/schemas/list-id-params.schema";
import * as listFollowersService from "./list-followers.service";

export async function postFollow(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	await listFollowersService.followList(params.listId, user.id);
	return response.sendStatus(201);
}

export async function deleteFollow(request: Request, response: Response) {
	const params = request.locals.params as ListIdParams;
	const user = request.locals.user as RequestUser;

	await listFollowersService.unfollowList(params.listId, user.id);
	return response.sendStatus(204);
}
