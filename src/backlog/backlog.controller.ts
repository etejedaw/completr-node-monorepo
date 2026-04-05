import { RequestUser } from "../common/interfaces/request-user.interface";
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

export async function postBacklog(request: Request, response: Response) {
	const registerBacklog = request.locals.body as RegisterBacklogDto;
	const userId = (request.locals.user as RequestUser as RequestUser).id;

	const backlogEntry = await backlogService.createBacklog(
		userId,
		registerBacklog
	);
	const backlogPlain = backlogEntry.get({ plain: true });

	const data = { backlog: backlogSerializer(backlogPlain) };
	return response.status(201).json({ data });
}

export async function getMeBacklog(request: Request, response: Response) {
	const userId = (request.locals.user as RequestUser as RequestUser).id;
	const query = request.locals.query as BacklogQuery;

	const backlogEntries = await backlogService.findBacklogByUserId(
		userId,
		query
	);
	const backlogPlain = backlogEntries.map(p => p.get({ plain: true }));

	const data = { backlog: backlogPlain.map(backlogSerializer) };
	return response.status(200).json({ data });
}

export async function getUserBacklog(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query as BacklogQuery;

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
	const params = request.locals.params as BacklogIdParams;
	const dto = request.locals.body as UpdateBacklogDto;
	const userId = (request.locals.user as RequestUser as RequestUser).id;

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
	const params = request.locals.params as BacklogIdParams;
	const userId = (request.locals.user as RequestUser as RequestUser).id;

	await backlogService.removeBacklog(params.backlogId, userId);
	return response.sendStatus(204);
}
