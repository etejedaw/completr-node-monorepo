import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { gamePlatinumSerializer } from "./game-platinum.serializer";
import * as gamePlatinumService from "./game-platinum.service";
import { type GamePlatinumParams } from "./schemas/game-platinum-params.schema";
import { type UpsertGamePlatinumDto } from "./upsert-game-platinum.dto";

export async function putPlatinum(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GamePlatinumParams;
	const body = request.locals.body as UpsertGamePlatinumDto;

	const { platinum, created } = await gamePlatinumService.upsertPlatinum(
		user.id,
		params.gameId,
		body
	);
	if (created)
		activityService.record(user.id, "game_platinumed", params.gameId);

	const data = { platinum: gamePlatinumSerializer(platinum) };
	return response.status(created ? 201 : 200).json({ data });
}

export async function deletePlatinum(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GamePlatinumParams;

	await gamePlatinumService.removePlatinum(user.id, params.gameId);
	return response.sendStatus(204);
}
