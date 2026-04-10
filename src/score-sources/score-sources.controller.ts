import { Request, Response } from "express";
import * as scoreSourcesService from "./score-sources.service";
import { RegisterScoreSourceDto } from "./score-sources.schema";

export async function getScoreSources(_request: Request, response: Response) {
	const sources = await scoreSourcesService.findAll();
	const data = {
		sources: sources.map(s => ({
			code: s.code,
			name: s.name,
			scale: s.scale
		}))
	};
	return response.status(200).json({ data });
}

export async function postScoreSource(request: Request, response: Response) {
	const dto = request.locals.body as RegisterScoreSourceDto;
	const source = await scoreSourcesService.create(dto);
	const data = {
		source: { code: source.code, name: source.name, scale: source.scale }
	};
	return response.status(201).json({ data });
}
