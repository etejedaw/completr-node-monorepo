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
import * as activityService from "../activity/activity.service";

export async function postBacklog(request: Request, response: Response) {
	const registerBacklog = request.locals.body as RegisterBacklogDto;
	const user = request.locals.user as RequestUser;

	const backlogEntry = await backlogService.createBacklog(
		user.id,
		registerBacklog
	);
	const backlogPlain = backlogEntry.get({ plain: true });

	activityService.record(user.id, "backlog_added", backlogEntry.gameId);

	const data = { backlog: backlogSerializer(backlogPlain) };
	return response.status(201).json({ data });
}

export async function getMeBacklog(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query as BacklogQuery;

	const { rows, total } = await backlogService.findBacklogByUserId(
		user.id,
		query
	);
	const backlogPlain = rows.map(backlog => backlog.get({ plain: true }));

	const data = { backlog: backlogPlain.map(backlogSerializer), total };
	return response.status(200).json({ data });
}

export async function getUserBacklog(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query as BacklogQuery;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();

	const { rows, total } = await backlogService.findPublicBacklogByUserId(
		user.id,
		query
	);
	const backlogPlain = rows.map(backlog => backlog.get({ plain: true }));

	const data = { backlog: backlogPlain.map(backlogSerializer), total };
	return response.status(200).json({ data });
}

export async function patchBacklog(request: Request, response: Response) {
	const params = request.locals.params as BacklogIdParams;
	const updateBacklog = request.locals.body as UpdateBacklogDto;
	const user = request.locals.user as RequestUser;

	const backlogEntry = await backlogService.updateBacklog(
		params.backlogId,
		user.id,
		updateBacklog
	);
	const backlogPlain = backlogEntry.get({ plain: true });

	if (updateBacklog.status) {
		activityService.record(
			user.id,
			`backlog_${updateBacklog.status}` as Parameters<
				typeof activityService.record
			>[1],
			backlogEntry.gameId
		);
	}

	const data = { backlog: backlogSerializer(backlogPlain) };
	return response.status(200).json({ data });
}

export async function deleteBacklog(request: Request, response: Response) {
	const params = request.locals.params as BacklogIdParams;
	const user = request.locals.user as RequestUser;

	await backlogService.removeBacklog(params.backlogId, user.id);
	return response.sendStatus(204);
}
