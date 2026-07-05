import { type Request, type Response } from "express";
import type z from "zod";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as gamesService from "../games/games.service";
import * as coopService from "./coop-runs.service";
import { type AddMemberDto } from "./dtos/add-member.dto";
import { type SyncDto } from "./dtos/sync.dto";
import { type BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { type CandidatesQuerySchema } from "./schemas/candidates-query.schema";
import { type MemberParamsSchema } from "./schemas/member-params.schema";

type BacklogIdParams = z.infer<typeof BacklogIdParamsSchema>;
type MemberParams = z.infer<typeof MemberParamsSchema>;
type CandidatesQuery = z.infer<typeof CandidatesQuerySchema>;

export async function postMember(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as BacklogIdParams;
	const body = request.locals.body as AddMemberDto;

	const result = await coopService.addMember(
		user.id,
		params.backlogId,
		body.userId,
		body.targetBacklogId
	);

	const game = await gamesService.findGameById(result.gameId);
	const metadata = game
		? {
				game: {
					id: game.id,
					title: game.title,
					code: game.code,
					backgroundUrl: game.backgroundUrl
				}
			}
		: undefined;

	activityService.record(user.id, "coop_tagged", body.userId, metadata);

	return response.status(201).json({
		data: {
			coopRunId: result.coopRunId,
			targetBacklogId: result.targetBacklogId
		}
	});
}

export async function deleteMember(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as MemberParams;

	await coopService.removeMember(user.id, params.backlogId, params.userId);
	return response.sendStatus(204);
}

export async function postSync(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as BacklogIdParams;
	const body = request.locals.body as SyncDto;

	await coopService.syncFromMember(user.id, params.backlogId, body);
	return response.sendStatus(204);
}

export async function getMembers(request: Request, response: Response) {
	const params = request.locals.params as BacklogIdParams;

	const members = await coopService.findMembersForBacklog(params.backlogId);
	return response.status(200).json({ data: { members } });
}

export async function getCandidates(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as BacklogIdParams;
	const query = request.locals.query as CandidatesQuery;

	const result = await coopService.findCandidatesForTarget(
		user.id,
		params.backlogId,
		query.userId
	);

	return response.status(200).json({ data: result });
}
