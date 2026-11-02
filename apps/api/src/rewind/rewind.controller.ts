import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type UsernameParam } from "../users/schemas/username-params.schema";
import { type GenerateRewindDto } from "./generate-rewind.dto";
import { rewindSerializer, rewindYearsSerializer } from "./rewind.serializer";
import * as rewindService from "./rewind.service";
import { type OwnRewindYearParams } from "./schemas/own-rewind-year-params.schema";
import { type RewindYearParams } from "./schemas/rewind-year-params.schema";

export async function getUserRewinds(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const viewer = request.locals.user as RequestUser | undefined;

	const rewindYears = await rewindService.getRewindYearsForViewer(
		viewer?.id,
		username
	);

	return response
		.status(200)
		.json({ data: rewindYearsSerializer(rewindYears) });
}

export async function getUserRewind(request: Request, response: Response) {
	const { username, year } = request.locals.params as RewindYearParams;
	const viewer = request.locals.user as RequestUser | undefined;

	const rewind = await rewindService.getRewindForViewer(
		viewer?.id,
		username,
		year
	);

	return response.status(200).json({ data: rewindSerializer(rewind) });
}

export async function postOwnRewind(request: Request, response: Response) {
	const { year } = request.locals.params as OwnRewindYearParams;
	const dto = request.locals.body as GenerateRewindDto;
	const user = request.locals.user as RequestUser;

	const { rewind, created } = await rewindService.generateOwnRewind(
		user.id,
		year,
		dto
	);

	return response
		.status(created ? 201 : 200)
		.json({ data: rewindSerializer(rewind) });
}

export async function postOwnRewindAiRecap(
	request: Request,
	response: Response
) {
	const { year } = request.locals.params as OwnRewindYearParams;
	const user = request.locals.user as RequestUser;

	const rewind = await rewindService.addOwnRewindAiRecap(user.id, year);

	return response.status(200).json({ data: rewindSerializer(rewind) });
}
