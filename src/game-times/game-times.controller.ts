import { Request, Response } from "express";
import * as gameTimesService from "./game-times.service";
import { TimeSource } from "./game-time.model";

export async function postGameTime(request: Request, response: Response) {
	const { gameId, source, duration } = request.body as {
		gameId: string;
		source: TimeSource;
		duration: number;
	};

	const gameTime = await gameTimesService.upsertGameTime(
		gameId,
		source,
		duration
	);
	const data = { gameTime: gameTime.get({ plain: true }) };
	return response.status(201).json({ data });
}

export async function getGameTimes(request: Request, response: Response) {
	const { gameId } = request.params as { gameId: string };

	const times = await gameTimesService.findTimesByGameId(gameId);
	const data = {
		gameTimes: times.map(t => t.get({ plain: true }))
	};
	return response.status(200).json({ data });
}
