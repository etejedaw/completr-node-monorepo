import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type CreateTagDto } from "./dtos/create-tag.dto";
import { type ReplaceTagsDto } from "./dtos/replace-tags.dto";
import { type UpdateTagDto } from "./dtos/update-tag.dto";
import * as moodTagsService from "./mood-tags.service";
import { type GameIdParams } from "./schemas/game-id-params.schema";
import { type TagNameParams } from "./schemas/tag-name-params.schema";

export async function putGameTags(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParams;
	const body = request.locals.body as ReplaceTagsDto;

	const tags = await moodTagsService.replaceTags(
		user,
		params.gameId,
		body.tags
	);

	return response.status(200).json({ data: { tags } });
}

export async function getGameTags(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParams;

	const tags = await moodTagsService.findTagsByGame(user.id, params.gameId);

	return response.status(200).json({ data: { tags } });
}

export async function getMyTags(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const tags = await moodTagsService.findTagsByUser(user.id);

	return response.status(200).json({ data: { tags } });
}

export async function postTag(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const body = request.locals.body as CreateTagDto;

	const result = await moodTagsService.createTag(
		user,
		body.tag,
		body.description ?? null
	);

	return response
		.status(result.created ? 201 : 200)
		.json({ data: { tag: result.tag, description: result.description } });
}

export async function patchTag(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as TagNameParams;
	const body = request.locals.body as UpdateTagDto;

	if (body.newTag !== undefined) {
		await moodTagsService.renameTag(user.id, params.tag, body.newTag);
	}
	const finalTag = body.newTag ?? params.tag;
	if (body.description !== undefined) {
		await moodTagsService.setTagDescription(
			user,
			finalTag,
			body.description
		);
	}

	return response.status(200).json({ data: { tag: finalTag } });
}

export async function deleteTag(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as TagNameParams;

	await moodTagsService.deleteTag(user.id, params.tag);
	return response.sendStatus(204);
}
