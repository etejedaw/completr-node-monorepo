import {
	Op,
	Transaction,
	UniqueConstraintError,
	ValidationError
} from "sequelize";
import { sequelize } from "../database/sequelize.database";
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
import * as gameExternalService from "../game-external/game-external.service";
import { RawgProvider } from "../rawg/rawg.provider";
import { RawgGameDetail } from "../rawg/rawg.interface";
import { apiKeysConfig } from "../common/config/api-keys.config";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { rawgToGameMapper } from "./mappers/rawg-to-game.mapper";
import { PinoLogger } from "../common/logger/pino.logger";

const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);
const logger = new PinoLogger("GamesService");

export async function registerGame(registerGameDto: RegisterGameDto) {
	const transaction = await sequelize.transaction();

	try {
		const code = titleToSlug(registerGameDto.title);
		const { platforms, scores, times, genres, externalIds, ...gameDto } =
			registerGameDto;

		const gameDb = await Game.create({ ...gameDto, code }, { transaction });

		await linkPlatforms(gameDb.id, platforms, transaction);
		await createScores(gameDb.id, scores, transaction);
		await createTimes(gameDb.id, times, transaction);
		await linkGenres(gameDb.id, genres, transaction);

		await transaction.commit();

		if (externalIds) await upsertExternalIds(gameDb.id, externalIds);

		const gameCreated = await findGameById(gameDb.id);
		if (!gameCreated) throw gamesServiceError.notFoundError();

		return gameCreated;
	} catch (error) {
		await transaction.rollback();

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
			{ association: "GameTimes" },
			{ association: "GameExternals" },
			{
				association: "Dlcs",
				where: { isActive: true },
				required: false
			},
			{ association: "ParentGame" }
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

export interface GamesQueryOptions {
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: string;
	genre?: string;
}

export async function findAll(options: GamesQueryOptions = {}) {
	const {
		limit = 50,
		offset = 0,
		sort_by = "createdAt",
		sort_order = "desc",
		genre
	} = options;

	const where: Record<string, unknown> = { isActive: true };
	const include: { association: string; where?: Record<string, unknown> }[] =
		[
			{ association: "Platforms" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		];

	if (genre) {
		include.push({
			association: "Genres",
			where: { code: genre }
		});
	} else {
		include.push({ association: "Genres" });
	}

	const { rows, count } = await Game.findAndCountAll({
		where,
		include,
		order: [[sort_by, sort_order.toUpperCase()]],
		limit,
		offset,
		distinct: true
	});

	return { games: rows, total: count };
}

export async function searchGames(query: string, forceRawg = false) {
	if (!forceRawg) {
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
	}

	return searchAndCreateFromRawg(query);
}

export async function rawgLookup(query: string) {
	const results = await rawg.searchGame(query, {
		page_size: 10,
		exclude_additions: true
	});

	return results.map(r => ({
		rawgId: r.id,
		title: r.name,
		backgroundUrl: r.background_image,
		releaseAt: r.released,
		metacritic: r.metacritic,
		playtime: r.playtime,
		platforms: r.platforms.map(p => p.platform.slug),
		genres: r.genres.map(g => g.slug)
	}));
}

export async function rawgDetail(rawgId: number) {
	const detail = await rawg.getGameById(rawgId);
	return mapRawgDetail(detail);
}

export async function rawgDetailBySlug(slug: string) {
	const detail = await rawg.getGameBySlug(slug);
	return mapRawgDetail(detail);
}

function mapRawgDetail(detail: RawgGameDetail) {
	const mapped = rawgToGameMapper(detail);
	return {
		rawgId: detail.id,
		title: detail.name,
		description: detail.description_raw,
		coverUrl: detail.background_image,
		releaseAt: detail.released,
		platforms: mapped.game.platforms,
		genres: mapped.enrichment.genreSlugs ?? [],
		scores: mapped.enrichment.scores ?? [],
		times: mapped.enrichment.times ?? []
	};
}

async function searchAndCreateFromRawg(query: string) {
	try {
		const rawgResults = await rawg.searchGame(query, {
			page_size: 3,
			exclude_additions: true
		});

		const games: Game[] = [];

		for (const result of rawgResults) {
			try {
				const game = await resolveRawgResult(result.id);
				if (game) games.push(game);
			} catch (error) {
				logger.warn(
					"searchAndCreateFromRawg",
					`Failed to resolve RAWG ID ${result.id}`,
					error
				);
			}
		}

		const slugGame = await resolveRawgBySlug(query);
		if (slugGame && !games.some(g => g.id === slugGame.id)) {
			games.unshift(slugGame);
		}

		return games;
	} catch (error) {
		logger.warn("searchAndCreateFromRawg", "RAWG fallback failed", error);
		return [];
	}
}

async function resolveRawgBySlug(query: string) {
	try {
		const slug = titleToSlug(query);
		const detail = await rawg.getGameBySlug(slug);
		const game = await resolveRawgResult(detail.id);
		return game;
	} catch {
		return null;
	}
}

async function resolveRawgResult(rawgNumericId: number) {
	const rawgId = String(rawgNumericId);

	const existingExternal = await gameExternalService.findByExternalId(
		"rawg",
		rawgId
	);
	if (existingExternal) {
		return findGameById(existingExternal.gameId);
	}

	const rawgDetail = await rawg.getGameById(rawgNumericId);
	const mapped = rawgToGameMapper(rawgDetail);
	const existingByCode = await findGameByCode(titleToSlug(mapped.game.title));
	if (existingByCode) {
		await gameExternalService.create(existingByCode.id, "rawg", rawgId);
		return existingByCode;
	}

	const game = await registerGame({
		...mapped.game,
		scores: mapped.enrichment.scores,
		times: mapped.enrichment.times,
		genres: mapped.enrichment.genreSlugs ?? []
	});

	await gameExternalService.create(game.id, "rawg", rawgId);

	return game;
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

	const { platforms, genres, title, externalIds, ...gameDto } = updateGameDto;

	if (platforms) await platformsUpdate(game.id, platforms);
	if (genres) await genresUpdate(game.id, genres);
	if (externalIds) await upsertExternalIds(game.id, externalIds);

	const updateData: Record<string, unknown> = { ...gameDto };
	if (title) {
		updateData.title = title;
		updateData.code = titleToSlug(title);
	}

	await game.update(updateData);

	const updatedGame = await findGameById(id);
	return updatedGame as Game;
}

async function upsertExternalIds(
	gameId: string,
	externalIds: UpdateGameDto["externalIds"]
) {
	if (!externalIds) return;
	const promises = externalIds.map(({ source, externalId }) =>
		gameExternalService.upsert(gameId, source, externalId)
	);
	await Promise.all(promises);
}

export async function deactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) return false;

	await game.update({ isActive: false });
	return true;
}

export async function hardDeleteGame(id: string) {
	const game = await Game.findOne({ where: { id } });
	if (!game) throw gamesServiceError.notFoundError();

	await Game.destroy({ where: { id } });
	return true;
}

async function linkPlatforms(
	gameId: string,
	platforms: string[],
	transaction?: Transaction
) {
	if (platforms.length === 0) return;
	const platformsDb = await platformsService.findPlatformsByCode(platforms);
	if (platformsDb.length !== platforms.length)
		throw gamesServiceError.platformNotFoundError();
	await gamePlatformsService.linkGameToPlatforms(
		gameId,
		platformsDb.map(platform => platform.id),
		transaction
	);
}

async function createScores(
	gameId: string,
	scores: RegisterGameDto["scores"],
	transaction?: Transaction
) {
	if (!scores) return;
	const promises = scores.map(score =>
		gameScoresService.createGameScore(
			gameId,
			score.source,
			score.score,
			transaction
		)
	);
	await Promise.all(promises);
}

async function createTimes(
	gameId: string,
	times: RegisterGameDto["times"],
	transaction?: Transaction
) {
	if (!times) return;
	const promises = times.map(time =>
		gameTimesService.createGameTime(
			gameId,
			time.source,
			time.duration,
			transaction
		)
	);
	await Promise.all(promises);
}

async function linkGenres(
	gameId: string,
	genres: string[],
	transaction?: Transaction
) {
	if (genres.length === 0) return;
	const genreRecords = await genresService.findGenresByCode(genres);
	if (genreRecords.length !== genres.length)
		throw gamesServiceError.genreNotFoundError();
	await gameGenresService.linkGameToGenres(
		gameId,
		genreRecords.map(g => g.id),
		transaction
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
