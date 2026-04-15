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
		games: gamesPlain.map(gameSerializer),
		total,
		limit: query.limit,
		offset: query.offset
	};
	return response.status(200).json({ data });
}

export async function searchGames(request: Request, response: Response) {
	const query = request.locals.query as GameSearchQuery;

	const games = query.local_only
		? await gameService.searchGamesLocal(query.query)
		: await gameService.searchGames(query.query, query.force_rawg);
	const gamesPlain = games.map(game => game.get({ plain: true }));

	const data = { games: gamesPlain.map(gameSerializer) };
	return response.status(200).json({ data });
}

export async function postGame(request: Request, response: Response) {
	const registerGameDto = request.locals.body as RegisterGameDto;

	const gameRegister = await gameService.registerGame(registerGameDto);
	const gamePlain = gameRegister.get({ plain: true });

	const data = { game: gameSerializer(gamePlain) };
	return response.status(201).json({ data });
}

export async function patchGame(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const updateGameDto = request.locals.body as UpdateGameDto;

	const { id } = params;

	const game = await gameService.updateGame(id, updateGameDto);
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

export async function deleteGame(request: Request, response: Response) {
	const gameIdParam = request.locals.params as GameIdParam;
	const user = request.locals.user as RequestUser;
	const { id } = gameIdParam;

	const hard = request.query.hard === "true";

	if (hard) {
		if (user.role !== "admin") throw gameDomainError.gameForbidden();
		await gameService.hardDeleteGame(id);
	} else {
		await gameService.deactivateGame(id);
	}

	return response.sendStatus(204);
}
