import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type User } from "../users/user.model";
import { type CreateTagDto } from "./dtos/create-tag.dto";
import { type ReplaceFavoriteTagsDto } from "./dtos/replace-favorite-tags.dto";
import { type ReplaceTagsDto } from "./dtos/replace-tags.dto";
import { type UpdateTagDto } from "./dtos/update-tag.dto";
import {
	communityTagSerializer,
	favoriteTagSerializer,
	gameCommunityTagSerializer,
	taggedGamesPageSerializer
} from "./mood-tags.serializer";
import * as moodTagsService from "./mood-tags.service";
import { type GameIdParams } from "./schemas/game-id-params.schema";
import { type PopularTagsQuery } from "./schemas/popular-tags-query.schema";
import { type SearchTagsQuery } from "./schemas/search-tags-query.schema";
import { type TagGamesQuery } from "./schemas/tag-games-query.schema";
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

	const result = await moodTagsService.createTag(user, body.tag, {
		description: body.description,
		icon: body.icon,
		color: body.color
	});

	return response.status(result.created ? 201 : 200).json({
		data: {
			tag: result.tag,
			description: result.description,
			icon: result.icon,
			color: result.color
		}
	});
}

export async function patchTag(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as TagNameParams;
	const body = request.locals.body as UpdateTagDto;

	if (body.newTag !== undefined) {
		await moodTagsService.renameTag(user.id, params.tag, body.newTag);
	}
	const finalTag = body.newTag ?? params.tag;
	const details = {
		description: body.description,
		icon: body.icon,
		color: body.color
	};
	if (Object.values(details).some(value => value !== undefined)) {
		await moodTagsService.updateTagDetails(user, finalTag, details);
	}

	return response.status(200).json({ data: { tag: finalTag } });
}

export async function deleteTag(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as TagNameParams;

	await moodTagsService.deleteTag(user.id, params.tag);
	return response.sendStatus(204);
}

export async function putFavoriteTags(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const body = request.locals.body as ReplaceFavoriteTagsDto;

	const tags = await moodTagsService.replaceFavoriteTags(user.id, body.tags);

	return response.status(200).json({ data: { tags } });
}

export async function getUserFavoriteTags(
	request: Request,
	response: Response
) {
	const owner = request.locals.profileOwner as User;

	const favorites = await moodTagsService.findFavoriteTagsByUser(owner.id);

	return response
		.status(200)
		.json({ data: { tags: favorites.map(favoriteTagSerializer) } });
}

export async function getGameCommunityTags(
	request: Request,
	response: Response
) {
	const viewer = request.locals.user as RequestUser | undefined;
	const params = request.locals.params as GameIdParams;

	const tags = await moodTagsService.findGameCommunityTags(
		params.gameId,
		viewer?.id
	);

	return response
		.status(200)
		.json({ data: { tags: tags.map(gameCommunityTagSerializer) } });
}

export async function getPopularTags(request: Request, response: Response) {
	const query = request.locals.query as PopularTagsQuery;

	const tags = await moodTagsService.findPopularCommunityTags(query.limit);

	return response
		.status(200)
		.json({ data: { tags: tags.map(communityTagSerializer) } });
}

export async function getSearchTags(request: Request, response: Response) {
	const query = request.locals.query as SearchTagsQuery;

	const tags = await moodTagsService.searchCommunityTags(
		query.search,
		query.limit
	);

	return response
		.status(200)
		.json({ data: { tags: tags.map(communityTagSerializer) } });
}

export async function getTagGames(request: Request, response: Response) {
	const params = request.locals.params as TagNameParams;
	const query = request.locals.query as TagGamesQuery;

	const page = await moodTagsService.findPublicGamesByTag(params.tag, query);

	return response.status(200).json({ data: taggedGamesPageSerializer(page) });
}
