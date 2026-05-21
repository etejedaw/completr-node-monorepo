import { Request, Response } from "express";
import { RegisterGameDto } from "./dtos/register-game.dto";
import * as gameService from "./games.service";
import * as gameDomainError from "./errors/games.domain-error";
import { GameCodeParam } from "./schemas/game-code-params.schema";
import { GameSearchQuery } from "./schemas/game-search-query.schema";
import { gameSerializer } from "./games.serializer";
import { GameIdParam } from "./schemas/game-id-params.schema";
import { RawgIdParam } from "./schemas/rawg-id-params.schema";
import { UpdateGameDto } from "./dtos/update-game.dto";
import { GamesQuery } from "./schemas/games-query.schema";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as auditService from "../audit/audit.service";
import * as listsService from "../lists/lists.service";

export async function getGameByCode(request: Request, response: Response) {
	const params = request.locals.params as GameCodeParam;

	const { code } = params;

	const game = await gameService.findGameByCode(code);
	if (!game) throw gameDomainError.gameNotFound();

	const gamePlain = game.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(200).json({ data });
}

export async function getAllGames(request: Request, response: Response) {
	const query = request.locals.query as GamesQuery;
	const { games, total } = await gameService.findAll(query);

	const gamesPlain = games.map(game => game.get({ plain: true }));

	const data = {
		games: gamesPlain.map(g => gameSerializer(g)),
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

	const data = { games: gamesPlain.map(g => gameSerializer(g)) };
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

	const data = {
		items: items.map(i => ({
			id: i.id,
			position: i.position,
			childGameId: i.childGameId,
			childGame: i.ChildGame
				? gameSerializer(i.ChildGame.get({ plain: true }))
				: null
		}))
	};
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

export async function getGameLists(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;

	const [publicLists, myLists] = await Promise.all([
		listsService.findPublicListsByGameId(params.id),
		listsService.findUserListsWithGameFlag(user.id, params.id)
	]);

	const data = {
		lists: await Promise.all(
			publicLists.map(async list => {
				const progress = await listsService.getListProgress(
					list.id,
					user.id
				);
				return {
					id: list.id,
					name: list.name,
					description: list.description,
					isOfficial: list.User?.role === "admin",
					owner: list.User ? { username: list.User.username } : null,
					completed:
						progress.total > 0 &&
						progress.completed === progress.total
				};
			})
		),
		myLists
	};

	data.lists.sort((a, b) => {
		if (a.isOfficial && !b.isOfficial) return -1;
		if (!a.isOfficial && b.isOfficial) return 1;
		return 0;
	});

	return response.status(200).json({ data });
}
