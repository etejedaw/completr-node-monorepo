import { type Request, type Response } from "express";

import { type RegisterScoreSourceDto } from "./register-score-source.dto";
import { scoreSourceSerializer } from "./score-sources.serializer";
import * as scoreSourcesService from "./score-sources.service";

export async function getScoreSources(_request: Request, response: Response) {
	const sources = await scoreSourcesService.findAll();
	const data = { sources: sources.map(scoreSourceSerializer) };
	return response.status(200).json({ data });
}

export async function postScoreSource(request: Request, response: Response) {
	const dto = request.locals.body as RegisterScoreSourceDto;
	const source = await scoreSourcesService.create(dto);
	const data = { source: scoreSourceSerializer(source) };
	return response.status(201).json({ data });
}
