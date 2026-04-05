import { Request, Response } from "express";
import * as playthroughsService from "./playthroughs.service";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import { RegisterPlaythroughDto } from "./dtos/register-playthrough.dto";
import { UpdatePlaythroughDto } from "./dtos/update-playthrough.dto";
import { PlaythroughIdParams } from "./schemas/playthrough-id-params.schema";
import { PlaythroughQuery } from "./schemas/playthrough-query.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import { playthroughSerializer } from "./playthroughs.serializer";
import { CustomRequest } from "../common/interfaces/custom-request.interface";

export async function postPlaythrough(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const registerPlaythrough = request.body as RegisterPlaythroughDto;
	const userId = customRequest.user.id;

	const playthrough = await playthroughsService.createPlaythrough(
		userId,
		registerPlaythrough
	);
	const playthroughPlain = playthrough.get({ plain: true });

	const data = { playthrough: playthroughSerializer(playthroughPlain) };
	return response.status(201).json({ data });
}

export async function getMyPlaythroughs(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const userId = customRequest.user.id;
	const query = request.query as unknown as PlaythroughQuery;

	const playthroughs = await playthroughsService.findPlaythroughsByUserId(
		userId,
		query
	);
	const playthroughsPlain = playthroughs.map(p => p.get({ plain: true }));

	const data = { playthroughs: playthroughsPlain.map(playthroughSerializer) };
	return response.status(200).json({ data });
}

export async function getUserPlaythroughs(
	request: Request,
	response: Response
) {
	const params = request.params as UsernameParam;
	const query = request.query as unknown as PlaythroughQuery;

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();

	const playthroughs =
		await playthroughsService.findPublicPlaythroughsByUserId(
			user.id,
			query
		);
	const playthroughsPlain = playthroughs.map(p => p.get({ plain: true }));

	const data = { playthroughs: playthroughsPlain.map(playthroughSerializer) };
	return response.status(200).json({ data });
}

export async function patchPlaythrough(request: Request, response: Response) {
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

export async function deletePlaythrough(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const params = request.params as PlaythroughIdParams;
	const userId = customRequest.user.id;

	await playthroughsService.removePlaythrough(params.playthroughId, userId);
	return response.sendStatus(204);
}
