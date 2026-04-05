import { Request, Response } from "express";
import * as backlogService from "./backlog.service";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { RegisterBacklogDto } from "./dtos/register-backlog.dto";
import { UpdateBacklogDto } from "./dtos/update-backlog.dto";
import { BacklogIdParams } from "./schemas/backlog-id-params.schema";
import { BacklogQuery } from "./schemas/backlog-query.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import { backlogSerializer } from "./backlog.serializer";
import { CustomRequest } from "../common/interfaces/custom-request.interface";

export async function postBacklog(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const registerBacklog = request.body as RegisterBacklogDto;
	const userId = customRequest.user.id;

	const backlogEntry = await backlogService.createBacklog(
		userId,
		registerBacklog
	);
	const backlogPlain = backlogEntry.get({ plain: true });

	const data = { backlog: backlogSerializer(backlogPlain) };
	return response.status(201).json({ data });
}

export async function getMeBacklog(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const userId = customRequest.user.id;
	const query = request.query as unknown as BacklogQuery;

	const backlogEntries = await backlogService.findBacklogByUserId(
		userId,
		query
	);
	const backlogPlain = backlogEntries.map(p => p.get({ plain: true }));

	const data = { backlog: backlogPlain.map(backlogSerializer) };
	return response.status(200).json({ data });
}

export async function getUserBacklog(request: Request, response: Response) {
	const params = request.params as UsernameParam;
	const query = request.query as unknown as BacklogQuery;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();

	const backlogEntries = await backlogService.findPublicBacklogByUserId(
		user.id,
		query
	);
	const backlogPlain = backlogEntries.map(p => p.get({ plain: true }));

	const data = { backlog: backlogPlain.map(backlogSerializer) };
	return response.status(200).json({ data });
}

export async function patchBacklog(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const params = request.params as BacklogIdParams;
	const dto = request.body as UpdateBacklogDto;
	const userId = customRequest.user.id;

	const backlogEntry = await backlogService.updateBacklog(
		params.backlogId,
		userId,
		dto
	);
	const backlogPlain = backlogEntry!.get({ plain: true });

	const data = { backlog: backlogSerializer(backlogPlain) };
	return response.status(200).json({ data });
}

export async function deleteBacklog(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const params = request.params as BacklogIdParams;
	const userId = customRequest.user.id;

	await backlogService.removeBacklog(params.backlogId, userId);
	return response.sendStatus(204);
}
