import { type Request, type Response } from "express";

import * as gamesService from "../games/games.service";
import { type ExternalSlugParam } from "./schemas/external-slug-params.schema";

export async function getRawgBySlug(request: Request, response: Response) {
	const params = request.locals.params as ExternalSlugParam;
	const detail = await gamesService.rawgDetailBySlug(params.slug);
	return response.status(200).json({ data: { game: detail } });
}

export async function getIgdbBySlug(request: Request, response: Response) {
	const params = request.locals.params as ExternalSlugParam;
	const detail = await gamesService.igdbDetailBySlug(params.slug);
	return response.status(200).json({ data: { game: detail } });
}
