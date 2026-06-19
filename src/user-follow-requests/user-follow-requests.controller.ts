import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { UsernameParam } from "../users/schemas/username-params.schema";
import { RequesterIdParam } from "./schemas/requester-id-params.schema";
import * as service from "./user-follow-requests.service";
import * as activityService from "../activity/activity.service";

export async function getIncomingRequests(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;
	const rows = await service.listIncomingRequests(user.id);
	const data = rows.map(row => ({
		requesterId: row.requesterId,
		createdAt: row.createdAt,
		user: row.Requester
	}));
	return response.status(200).json({ data: { requests: data } });
}

export async function postAcceptRequest(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { requesterId } = request.locals.params as RequesterIdParam;

	await service.acceptRequest(user.id, requesterId);

	activityService.record(requesterId, "user_followed", user.id);
	activityService.record(user.id, "user_followed_by", requesterId);

	return response.sendStatus(204);
}

export async function postRejectRequest(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { requesterId } = request.locals.params as RequesterIdParam;

	await service.rejectRequest(user.id, requesterId);
	return response.sendStatus(204);
}

export async function deleteOutgoingRequest(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;
	const { username } = request.locals.params as UsernameParam;

	await service.cancelOutgoingRequest(user.id, username);
	return response.sendStatus(204);
}
