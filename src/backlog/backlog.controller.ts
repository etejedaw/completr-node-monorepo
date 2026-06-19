import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as backlogService from "./backlog.service";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { canView } from "../users/visibility.helper";
import { RegisterBacklogDto } from "./dtos/register-backlog.dto";
import { UpdateBacklogDto } from "./dtos/update-backlog.dto";
import { BacklogIdParams } from "./schemas/backlog-id-params.schema";
import { BacklogQuery } from "./schemas/backlog-query.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import {
	backlogSerializer,
	backlogPublicSerializer
} from "./backlog.serializer";
import * as activityService from "../activity/activity.service";
import * as reviewsService from "../reviews/reviews.service";

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

	const gameIds = backlogPlain.map(entry => entry.gameId);
	const reviewByGameId =
		gameIds.length > 0
			? await reviewsService.findReviewContentByUserAndGameIds(
					user.id,
					gameIds
				)
			: new Map<
					string,
					{ content: string | null; rating: number | null }
				>();

	const data = {
		backlog: backlogPlain.map(entry =>
			backlogSerializer(entry, reviewByGameId.get(entry.gameId))
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getUserBacklog(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query as BacklogQuery;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;
	const isSelf = currentUser?.id === user.id;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomainError.userPrivate();
	if (!(await canView(currentUser?.id, user, "backlog")))
		throw userDomainError.userPrivate();

	const { rows, total } = isSelf
		? await backlogService.findBacklogByUserId(user.id, query)
		: await backlogService.findPublicBacklogByUserId(user.id, query);
	const backlogPlain = rows.map(backlog => backlog.get({ plain: true }));

	const reviews = await reviewsService.findReviewsByUserId(user.id);
	const reviewByGameId = new Map(reviews.map(r => [r.gameId, r]));

	const data = {
		backlog: backlogPlain.map(entry =>
			isSelf
				? backlogSerializer(entry, reviewByGameId.get(entry.gameId))
				: backlogPublicSerializer(
						entry,
						reviewByGameId.get(entry.gameId)
					)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function patchBacklog(request: Request, response: Response) {
	const params = request.locals.params as BacklogIdParams;
	const updateBacklog = request.locals.body as UpdateBacklogDto;
	const user = request.locals.user as RequestUser;

	const previous = await backlogService.findBacklogById(params.backlogId);
	const previousStatus = previous?.status;

	const { backlog: backlogEntry, queueRemoved } =
		await backlogService.updateBacklog(
			params.backlogId,
			user.id,
			updateBacklog
		);
	const backlogPlain = backlogEntry.get({ plain: true });

	if (updateBacklog.status && updateBacklog.status !== previousStatus) {
		activityService.record(
			user.id,
			`backlog_${updateBacklog.status}` as Parameters<
				typeof activityService.record
			>[1],
			backlogEntry.gameId
		);
	}

	const data = {
		backlog: backlogSerializer(backlogPlain),
		queueRemoved
	};
	return response.status(200).json({ data });
}

export async function deleteBacklog(request: Request, response: Response) {
	const params = request.locals.params as BacklogIdParams;
	const user = request.locals.user as RequestUser;

	await backlogService.removeBacklog(params.backlogId, user.id);
	return response.sendStatus(204);
}
