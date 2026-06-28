import { Request, Response } from "express";
import z from "zod";

import * as activityService from "../activity/activity.service";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as coopService from "./coop-runs.service";
import { AddMemberDto } from "./dtos/add-member.dto";
import { SyncDto } from "./dtos/sync.dto";
import { BacklogIdParamsSchema } from "./schemas/backlog-id-params.schema";
import { CandidatesQuerySchema } from "./schemas/candidates-query.schema";
import { MemberParamsSchema } from "./schemas/member-params.schema";

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

	activityService.record(user.id, "coop_tagged", body.userId);

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
