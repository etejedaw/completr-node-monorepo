import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { canView } from "../users/helpers/visibility.helper";
import * as queueService from "./queue.service";
import * as queueDomainError from "./errors/queue.domain-error";
import * as activityService from "../activity/activity.service";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import { AddQueueBody } from "./schemas/add-queue-body.schema";
import { AddQueueQuery } from "./schemas/add-queue-query.schema";
import { ReplaceQueueBody } from "./schemas/replace-queue.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import { queueSerializer } from "./queue.serializer";

export async function postQueue(request: Request, response: Response) {
	const body = request.locals.body as AddQueueBody;
	const query = request.locals.query as AddQueueQuery;
	const user = request.locals.user as RequestUser;

	let entry;

	if (query.source === "game") {
		if (!body.platformId) throw queueDomainError.queueSourceMismatch();
		entry = await queueService.addFromGame(body.id, body.platformId, user);
	} else {
		entry = await queueService.addFromBacklog(body.id, user);
	}

	const entryPlain = entry!.get({ plain: true });
	const gameId = entryPlain.Backlog?.gameId;
	if (gameId) {
		activityService.record(user.id, "queue_added", gameId);
	}

	const data = { queue: queueSerializer(entryPlain) };
	return response.status(201).json({ data });
}

export async function putQueue(request: Request, response: Response) {
	const body = request.locals.body as ReplaceQueueBody;
	const user = request.locals.user as RequestUser;

	const entries = await queueService.replaceQueue(user, body.backlogIds);
	const entriesPlain = entries.map(e => e.get({ plain: true }));
	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain
			.map(e => e.Backlog?.gameId)
			.filter((id): id is string => !!id)
	);

	const data = {
		queue: entriesPlain.map(e =>
			queueSerializer(
				e,
				e.Backlog?.gameId ? tagsByGame.get(e.Backlog.gameId) : undefined
			)
		)
	};
	return response.status(200).json({ data });
}

export async function getMeQueue(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { rows, total } = await queueService.findQueueByUserIdPaginated(
		user.id,
		query
	);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain
			.map(e => e.Backlog?.gameId)
			.filter((id): id is string => !!id)
	);

	const data = {
		queue: entriesPlain.map(e =>
			queueSerializer(
				e,
				e.Backlog?.gameId ? tagsByGame.get(e.Backlog.gameId) : undefined
			)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function getUserQueue(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();

	const currentUser = request.locals.user as RequestUser | undefined;

	if (!(await canView(currentUser?.id, user, "profile")))
		throw userDomainError.userPrivate();
	if (!(await canView(currentUser?.id, user, "queue")))
		throw userDomainError.userPrivate();

	const { rows, total } = await queueService.findQueueByUserIdPaginated(
		user.id,
		query
	);
	const entriesPlain = rows.map(e => e.get({ plain: true }));
	const tagsByGame = await moodTagsService.findTagsForGames(
		user.id,
		entriesPlain
			.map(e => e.Backlog?.gameId)
			.filter((id): id is string => !!id)
	);

	const data = {
		queue: entriesPlain.map(e =>
			queueSerializer(
				e,
				e.Backlog?.gameId ? tagsByGame.get(e.Backlog.gameId) : undefined
			)
		),
		total
	};
	return response.status(200).json({ data });
}
