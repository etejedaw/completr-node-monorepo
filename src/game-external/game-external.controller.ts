import { Request, Response } from "express";

import * as gamesService from "../games/games.service";
import { RawgSlugParam } from "./schemas/rawg-slug-params.schema";

export async function getRawgBySlug(request: Request, response: Response) {
	const params = request.locals.params as RawgSlugParam;
	const detail = await gamesService.rawgDetailBySlug(params.slug);
	return response.status(200).json({ data: { game: detail } });
}
