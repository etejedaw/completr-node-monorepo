import { Request, Response } from "express";
import * as playthroughsService from "./playthroughs.service";
import { RegisterPlaythroughDto } from "./dtos/register-playthrough.dto";
import { UpdatePlaythroughDto } from "./dtos/update-playthrough.dto";
import { PlaythroughIdParams } from "./schemas/playthrough-id-params.schema";
import { PlaythroughQuery } from "./schemas/playthrough-query.schema";
import { playthroughSerializer } from "./playthroughs.serializer";
import { CustomRequest } from "../common/interfaces/custom-request.interface";

export async function postPlaythrough(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const dto = request.body as RegisterPlaythroughDto;
	const userId = customRequest.user.id;

	const playthrough = await playthroughsService.createPlaythrough(
		userId,
		dto
	);
	const full = await playthroughsService.findPlaythroughById(
		playthrough.id
	);
	const playthroughPlain = full!.get({ plain: true });

	const data = { playthrough: playthroughSerializer(playthroughPlain) };
	return response.status(201).json({ data });
}

export async function getMyPlaythroughs(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const userId = customRequest.user.id;
	const query = request.query as unknown as PlaythroughQuery;

	const playthroughs =
		await playthroughsService.findPlaythroughsByUserId(userId, query);
	const playthroughsPlain = playthroughs.map((p) =>
		p.get({ plain: true })
	);

	// Calculate playthrough numbers per game (ordered by createdAt ASC)
	const gameNumbers = new Map<string, number>();
	const sorted = [...playthroughsPlain].sort(
		(a, b) =>
			new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
	);
	for (const p of sorted) {
		const count = (gameNumbers.get(p.gameId) ?? 0) + 1;
		gameNumbers.set(p.gameId, count);
	}

	// Build number map by id
	const numberMap = new Map<string, number>();
	const gameCounters = new Map<string, number>();
	for (const p of sorted) {
		const n = (gameCounters.get(p.gameId) ?? 0) + 1;
		gameCounters.set(p.gameId, n);
		numberMap.set(p.id, n);
	}

	const data = {
		playthroughs: playthroughsPlain.map((p) =>
			playthroughSerializer(p, numberMap.get(p.id))
		)
	};
	return response.status(200).json({ data });
}

export async function patchPlaythrough(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const params = request.params as PlaythroughIdParams;
	const dto = request.body as UpdatePlaythroughDto;
	const userId = customRequest.user.id;

	const playthrough = await playthroughsService.updatePlaythrough(
		params.playthroughId,
		userId,
		dto
	);
	const playthroughPlain = playthrough!.get({ plain: true });

	const data = { playthrough: playthroughSerializer(playthroughPlain) };
	return response.status(200).json({ data });
}

export async function deletePlaythrough(
	request: Request,
	response: Response
) {
	const customRequest = request as CustomRequest;
	const params = request.params as PlaythroughIdParams;
	const userId = customRequest.user.id;

	await playthroughsService.removePlaythrough(
		params.playthroughId,
		userId
	);
	return response.sendStatus(204);
}
