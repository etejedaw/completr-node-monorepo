import { Request, Response } from "express";
import z from "zod";

import { RequestUser } from "../common/interfaces/request-user.interface";
import { backlogProgressSerializer } from "./backlog-progress.serializer";
import * as backlogProgressService from "./backlog-progress.service";
import { AddProgressDto } from "./dtos/add-progress.dto";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { NoteIdParamsSchema } from "./schemas/note-id-params.schema";

type BacklogIdParams = z.infer<typeof BacklogIdParamsSchema>;
type NoteIdParams = z.infer<typeof NoteIdParamsSchema>;

export async function postProgress(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as BacklogIdParams;
	const body = request.locals.body as AddProgressDto;

	const entry = await backlogProgressService.addProgress(
		user.id,
		params.backlogId,
		body.note.trim()
	);

	return response.status(201).json({
		data: {
			progress: backlogProgressSerializer(entry.get({ plain: true }))
		}
	});
}

export async function getProgress(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as BacklogIdParams;

	const entries = await backlogProgressService.findProgressByBacklog(
		user.id,
		params.backlogId
	);

	return response.status(200).json({
		data: {
			progress: entries
				.map(e => e.get({ plain: true }))
				.map(backlogProgressSerializer)
		}
	});
}

export async function deleteProgress(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as NoteIdParams;

	await backlogProgressService.removeProgress(
		user.id,
		params.backlogId,
		params.noteId
	);

	return response.sendStatus(204);
}
