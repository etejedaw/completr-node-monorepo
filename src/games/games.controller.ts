import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import * as franchiseService from "../franchises/franchises.service";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import { type RegisterGameDto } from "./dtos/register-game.dto";
import { type UpdateGameDto } from "./dtos/update-game.dto";
import * as gameDomainError from "./errors/games.domain-error";
import {
	compilationItemSerializer,
	gameAdminListSerializer,
	gameFriendActivitySerializer,
	gameListSerializer,
	gameListSummarySerializer,
	gamePlayerSerializer,
	gameSerializer
} from "./games.serializer";
import * as gameService from "./games.service";
import { type GameCodeParam } from "./schemas/game-code-params.schema";
import { type GameIdParam } from "./schemas/game-id-params.schema";
import { type GameSearchQuery } from "./schemas/game-search-query.schema";
import { type GamesQuery } from "./schemas/games-query.schema";
import { type RawgIdParam } from "./schemas/rawg-id-params.schema";
import * as gamesProfileService from "./services/games-profile.service";
import { mapGamesQueryToOptions } from "./utils/games-query.adapter";

export async function getGameByCode(request: Request, response: Response) {
	const params = request.locals.params as GameCodeParam;
	const user = request.locals.user as RequestUser | undefined;

	const { code } = params;

	const game = await gameService.findGameByCode(code);
	if (!game) throw gameDomainError.gameNotFound();

	const gamePlain = game.get({ plain: true });
	const [userMoodTags, franchiseProgress, franchiseTracked] =
		await Promise.all([
			user ? moodTagsService.findTagsByGame(user.id, game.id) : [],
			buildFranchiseProgress(game.franchiseId, user),
			user && game.franchiseId
				? franchiseService.isTrackingFranchise(
						user.id,
						game.franchiseId
					)
				: Promise.resolve(false)
		]);

	const data = {
		game: {
			...gameSerializer(gamePlain),
			userMoodTags,
			franchiseProgress,
			franchiseTracked
		}
	};
	return response.status(200).json({ data });
}

const FRANCHISE_COMPLETED_STATUSES = ["completed", "abandoned", "endless"];

async function buildFranchiseProgress(
	franchiseId: string | null | undefined,
	user: RequestUser | undefined
) {
	if (!franchiseId) return null;

	const gameIds = await gameService.findGameIdsByFranchiseId(franchiseId);
	const completed = user
		? await backlogService.countDistinctGamesByUserStatusAndGameIds(
				user.id,
				gameIds,
				FRANCHISE_COMPLETED_STATUSES
			)
		: 0;
	return { completed, total: gameIds.length };
}

export async function getAllGames(request: Request, response: Response) {
	const query = request.locals.query as GamesQuery;
	const options = mapGamesQueryToOptions(query);
	const { games, total } = await gameService.findAll(options);

	const gamesPlain = games.map(game => game.get({ plain: true }));

	const serialize = query.detailed
		? gameAdminListSerializer
		: gameListSerializer;

	const data = {
		games: gamesPlain.map(g => serialize(g)),
		total,
		limit: query.limit,
		offset: query.offset
	};
	return response.status(200).json({ data });
}

export async function getLatestReviewedGames(
	request: Request,
	response: Response
) {
	const limit = Number(request.query.limit ?? 16);
	const games = await gameService.findLatestReviewed(limit);
	const gamesPlain = games.map(game => game.get({ plain: true }));

	const data = { games: gamesPlain.map(g => gameListSerializer(g)) };
	return response.status(200).json({ data });
}

export async function searchGames(request: Request, response: Response) {
	const query = request.locals.query as GameSearchQuery;

	if (query.local_only) {
		const games = await gameService.searchGamesLocal(query.query);
		const data = {
			games: games
				.map(g => g.get({ plain: true }))
				.map(g => gameSerializer(g))
		};
		return response.status(200).json({ data });
	}

	const { games, importedIds } = await gameService.searchGames(
		query.query,
		query.force_rawg
	);
	const data = {
		games: games
			.map(g => g.get({ plain: true }))
			.map(g =>
				gameSerializer(g, { justImported: importedIds.has(g.id) })
			)
	};
	return response.status(200).json({ data });
}

export async function postGame(request: Request, response: Response) {
	const registerGameDto = request.locals.body as RegisterGameDto;
	const user = request.locals.user as RequestUser;

	const gameRegister = await gameService.registerGame(registerGameDto);
	auditService.record(user.id, "game_created", "game", gameRegister.id);

	const gamePlain = gameRegister.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(201).json({ data });
}

export async function patchGame(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const updateGameDto = request.locals.body as UpdateGameDto;
	const user = request.locals.user as RequestUser;

	const { id } = params;

	const game = await gameService.updateGame(id, updateGameDto);
	auditService.record(user.id, "game_edited", "game", id);

	const gamePlain = game.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(200).json({ data });
}

export async function getRawgLookup(request: Request, response: Response) {
	const query = request.locals.query as GameSearchQuery;
	const results = await gameService.rawgLookup(query.query);
	return response.status(200).json({ data: { results } });
}

export async function getRawgDetail(request: Request, response: Response) {
	const params = request.locals.params as RawgIdParam;
	const detail = await gameService.rawgDetail(params.rawgId);
	return response.status(200).json({ data: { game: detail } });
}

export async function putCompilationItems(
	request: Request,
	response: Response
) {
	const params = request.locals.params as GameIdParam;
	const body = request.locals.body as {
		items: (
			| { mode: "link"; gameId: string }
			| { mode: "create"; title: string }
		)[];
	};
	const user = request.locals.user as RequestUser;

	const items = await gameService.setCompilationItems(params.id, body.items);
	auditService.record(user.id, "game_compilation_set", "game", params.id);

	const data = { items: items.map(compilationItemSerializer) };
	return response.status(200).json({ data });
}

export async function deleteCompilation(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;

	await gameService.clearCompilation(params.id);
	auditService.record(user.id, "game_compilation_cleared", "game", params.id);

	return response.sendStatus(204);
}

export async function postSplitGame(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const body = request.locals.body as {
		variants: { title: string; variant: string }[];
	};
	const user = request.locals.user as RequestUser;

	const games = await gameService.splitGame(params.id, body.variants);
	auditService.record(user.id, "game_split", "game", params.id);

	const data = {
		games: games.map(g => gameSerializer(g.get({ plain: true })))
	};
	return response.status(200).json({ data });
}

export async function deleteGame(request: Request, response: Response) {
	const gameIdParam = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;
	const { id } = gameIdParam;

	const hard = request.query.hard === "true";

	if (hard) {
		if (user.role !== "admin") throw gameDomainError.gameForbidden();
		await gameService.hardDeleteGame(id);
		auditService.record(user.id, "game_deleted", "game", id);
	} else {
		await gameService.deactivateGame(id);
		auditService.record(user.id, "game_deactivated", "game", id);
	}

	return response.sendStatus(204);
}

export async function reactivateGame(request: Request, response: Response) {
	const gameIdParam = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;
	const { id } = gameIdParam;

	const ok = await gameService.reactivateGame(id);
	if (!ok) throw gameDomainError.gameNotFound();

	auditService.record(user.id, "game_reactivated", "game", id);
	return response.sendStatus(204);
}

export async function getGameLists(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;

	const bundle = await gamesProfileService.getListsForGame(
		user.id,
		params.id
	);

	const data = {
		lists: bundle.lists.map(gameListSummarySerializer),
		myLists: bundle.myLists
	};
	return response.status(200).json({ data });
}

export async function getGameFriendsActivity(
	request: Request,
	response: Response
) {
	const params = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;

	const entries = await gamesProfileService.getFriendsActivityForGame(
		user.id,
		params.id
	);

	const data = { friends: entries.map(gameFriendActivitySerializer) };
	return response.status(200).json({ data });
}

export async function getGamePlayers(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;

	const entries = await gamesProfileService.getPlayersForGame(
		user.id,
		params.id
	);

	const data = { players: entries.map(gamePlayerSerializer) };
	return response.status(200).json({ data });
}
