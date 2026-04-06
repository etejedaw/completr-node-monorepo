import { Op, UniqueConstraintError, ValidationError } from "sequelize";
import { RegisterGameDto } from "./dtos/register-game.dto";
import { Game } from "./game.model";
import { UpdateGameDto } from "./dtos/update-game.dto";
import * as gamesServiceError from "./errors/games.service-error";
import * as gamePlatformsService from "../game-platform/game-platform.service";
import * as gameGenresService from "../game-genre/game-genre.service";
import * as platformsService from "../platforms/platforms.service";
import * as genresService from "../genres/genres.service";
import * as gameScoresService from "../game-scores/game-scores.service";
import * as gameTimesService from "../game-times/game-times.service";
import { RawgProvider } from "../rawg/rawg.provider";
import { apiKeysConfig } from "../common/config/api-keys.config";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { rawgToGameMapper } from "./mappers/rawg-to-game.mapper";
import { PinoLogger } from "../common/logger/pino.logger";

const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);
const logger = new PinoLogger("GamesService");

export async function registerGame(registerGameDto: RegisterGameDto) {
	try {
		const code = titleToSlug(registerGameDto.title);
		const { platforms, scores, times, genres, ...gameDto } =
			registerGameDto;

		const gameDb = await Game.create({ ...gameDto, code });

		await linkPlatforms(gameDb.id, platforms);
		await createScores(gameDb.id, scores);
		await createTimes(gameDb.id, times);
		await linkGenres(gameDb.id, genres);

		const gameCreated = await findGameById(gameDb.id);
		if (!gameCreated) throw gamesServiceError.notFoundError();

		return gameCreated;
	} catch (error) {
		if (error instanceof UniqueConstraintError)
			throw gamesServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw gamesServiceError.validationError(error);
		throw error;
	}
}

export async function findGameByCode(code: string) {
	return await Game.findOne({
		where: { code, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
}

export async function findGameById(id: string) {
	return await Game.findOne({
		where: { id, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
}

export async function findAll() {
	return await Game.findAll({
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
}

export async function searchGames(query: string) {
	const localResults = await Game.findAll({
		where: {
			title: { [Op.iLike]: `%${query}%` },
			isActive: true
		},
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});

	if (localResults.length > 0) return localResults;

	return searchAndCreateFromRawg(query);
}

async function searchAndCreateFromRawg(query: string) {
	try {
		const rawgResults = await rawg.searchGame(query, { page_size: 5 });
		const firstResult = rawgResults[0];
		if (!firstResult) return [];

		const rawgDetail = await rawg.getGameById(firstResult.id);
		const mapped = rawgToGameMapper(rawgDetail);
		const existing = await findGameByCode(titleToSlug(mapped.game.title));
		if (existing) return [existing];

		const game = await registerGame({
			...mapped.game,
			scores: mapped.enrichment.scores,
			times: mapped.enrichment.times,
			genres: mapped.enrichment.genreSlugs ?? []
		});
		return [game];
	} catch (error) {
		logger.warn("searchAndCreateFromRawg", "RAWG fallback failed", error);
		return [];
	}
}

export async function findGamesByGenreCode(genreCode: string) {
	return await Game.findAll({
		where: { isActive: true },
		include: [
			{ association: "Platforms" },
			{
				association: "Genres",
				where: { code: genreCode }
			},
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
}

export async function updateGame(id: string, updateGameDto: UpdateGameDto) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	const { platforms, genres, ...gameDto } = updateGameDto;

	if (platforms) await platformsUpdate(game.id, platforms);
	if (genres) await genresUpdate(game.id, genres);

	await game.update(gameDto);

	const updatedGame = await findGameById(id);
	return updatedGame as Game;
}

export async function deactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) return false;

	await game.update({ isActive: false });
	return true;
}

async function linkPlatforms(gameId: string, platforms: string[]) {
	if (platforms.length === 0) return;
	const platformsDb = await platformsService.findPlatformsByCode(platforms);
	await gamePlatformsService.linkGameToPlatforms(
		gameId,
		platformsDb.map(platform => platform.id)
	);
}

async function createScores(gameId: string, scores: RegisterGameDto["scores"]) {
	if (!scores) return;
	const promises = scores.map(score =>
		gameScoresService.createGameScore(gameId, score.source, score.score)
	);
	await Promise.all(promises);
}

async function createTimes(gameId: string, times: RegisterGameDto["times"]) {
	if (!times) return;
	const promises = times.map(time =>
		gameTimesService.createGameTime(gameId, time.source, time.duration)
	);
	await Promise.all(promises);
}

async function linkGenres(gameId: string, genres: string[]) {
	if (genres.length === 0) return;
	const genreRecords = await genresService.findGenresByCode(genres);
	if (!genreRecords.length) return;
	await gameGenresService.linkGameToGenres(
		gameId,
		genreRecords.map(g => g.id)
	);
}

async function platformsUpdate(gameId: string, platforms: string[]) {
	if (platforms.length === 0)
		return await gamePlatformsService.replaceGamePlatforms(gameId, []);

	const platformDb = await platformsService.findPlatformsByCode(platforms);

	if (platformDb.length !== platforms.length)
		throw gamesServiceError.platformNotFoundError();

	const platformsIds = platformDb.map(platform => platform.id);
	await gamePlatformsService.replaceGamePlatforms(gameId, platformsIds);
}

async function genresUpdate(gameId: string, genres: string[]) {
	if (genres.length === 0)
		return await gameGenresService.replaceGameGenres(gameId, []);

	const genreDb = await genresService.findGenresByCode(genres);

	if (genreDb.length !== genres.length)
		throw gamesServiceError.genreNotFoundError();

	const genreIds = genreDb.map(genre => genre.id);
	await gameGenresService.replaceGameGenres(gameId, genreIds);
}
