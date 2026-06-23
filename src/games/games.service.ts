import { Transaction } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
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
import { apiKeysConfig } from "../common/config/api-keys.config";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { rawgToGameMapper } from "./mappers/rawg-to-game.mapper";
import { PinoLogger } from "../common/logger/pino.logger";
import {
	buildTitleSearchWhere,
	findGameByCode,
	findGameById
} from "./services/games-search.service";
import { assertVariantConsistency } from "./services/games-variant.service";

export {
	findGameByCode,
	findGameById,
	findGamesByIds,
	findActiveGameSummaries,
	findAll,
	findLatestReviewed,
	searchGamesLocal,
	rawgLookup,
	rawgDetail,
	rawgDetailBySlug,
	findGamesByGenreCode
} from "./services/games-search.service";

export { splitGame } from "./services/games-variant.service";

export {
	setCompilationItems,
	clearCompilation,
	findCompilationItemsByParent,
	findCompilationParentsForChild,
	existsActiveCompilation,
	gameBelongsToCompilation
} from "./services/games-compilation.service";

export type {
	GamesQueryOptions,
	SplitVariantInput,
	SetCompilationItemInput
} from "./games.interface";

const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);
const logger = new PinoLogger("GamesService");

export async function registerGame(registerGameDto: RegisterGameDto) {
	if (registerGameDto.externalIds && registerGameDto.externalIds.length > 0) {
		await assertVariantConsistency(
			registerGameDto.externalIds,
			registerGameDto.variant ?? null,
			null
		);
	}

	const transaction = await sequelize.transaction();

	try {
		const code = titleToSlug(registerGameDto.title);
		if (!code)
			throw gamesServiceError.validationError(
				new Error("Title must contain at least one slug-safe character")
			);
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
		rethrowSequelizeError(error, {
			unique: gamesServiceError.uniqueConstraintError,
			validation: gamesServiceError.validationError
		});
	}
}

export async function updateGame(id: string, updateGameDto: UpdateGameDto) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	const { platforms, genres, title, externalIds, ...gameDto } = updateGameDto;

	const externalsForCheck =
		externalIds ??
		(await gameExternalService.findByGameId(game.id)).map(e => ({
			source: e.source,
			externalId: e.externalId
		}));
	const variantForCheck =
		updateGameDto.variant !== undefined
			? updateGameDto.variant
			: (game.variant ?? null);
	if (externalsForCheck.length > 0) {
		await assertVariantConsistency(
			externalsForCheck,
			variantForCheck,
			game.id
		);
	}

	if (platforms) await platformsUpdate(game.id, platforms);
	if (genres) await genresUpdate(game.id, genres);
	if (externalIds) await upsertExternalIds(game.id, externalIds);

	const updateData: Record<string, unknown> = { ...gameDto };
	if (title) {
		const code = titleToSlug(title);
		if (!code)
			throw gamesServiceError.validationError(
				new Error("Title must contain at least one slug-safe character")
			);
		updateData.title = title;
		updateData.code = code;
	}

	await game.update(updateData);

	const updatedGame = await findGameById(id);
	return updatedGame as Game;
}

export async function deactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) return false;

	await game.update({ isActive: false });
	return true;
}

export async function reactivateGame(id: string) {
	const game = await Game.findOne({ where: { id } });
	if (!game) return false;

	await game.update({ isActive: true });
	return true;
}

export async function hardDeleteGame(id: string) {
	const game = await Game.findOne({ where: { id } });
	if (!game) throw gamesServiceError.notFoundError();

	await Game.destroy({ where: { id } });
	return true;
}

export async function searchGames(query: string, forceRawg = false) {
	if (!forceRawg) {
		const titleWhere = buildTitleSearchWhere(query);
		if (titleWhere) {
			const localResults = await Game.findAll({
				where: {
					isActive: true,
					...titleWhere
				},
				include: [
					{ association: "Platforms" },
					{ association: "Genres" },
					{ association: "GameScores" },
					{ association: "GameTimes" }
				]
			});

			if (localResults.length > 0) {
				return { games: localResults, importedIds: new Set<string>() };
			}
		}
	}

	return searchAndCreateFromRawg(query);
}

async function searchAndCreateFromRawg(query: string) {
	const importedIds = new Set<string>();
	try {
		const rawgResults = await rawg.searchGame(query, {
			page_size: 3,
			exclude_additions: true
		});

		const games: Game[] = [];

		for (const result of rawgResults) {
			try {
				const resolved = await resolveRawgResult(result.id);
				if (resolved) {
					games.push(resolved.game);
					if (resolved.justImported)
						importedIds.add(resolved.game.id);
				}
			} catch (error) {
				logger.warn(
					"searchAndCreateFromRawg",
					`Failed to resolve RAWG ID ${result.id}`,
					error
				);
			}
		}

		const slugResolved = await resolveRawgBySlug(query);
		if (slugResolved && !games.some(g => g.id === slugResolved.game.id)) {
			games.unshift(slugResolved.game);
			if (slugResolved.justImported)
				importedIds.add(slugResolved.game.id);
		}

		return { games, importedIds };
	} catch (error) {
		logger.warn("searchAndCreateFromRawg", "RAWG fallback failed", error);
		return { games: [], importedIds };
	}
}

async function resolveRawgBySlug(query: string) {
	try {
		const slug = titleToSlug(query);
		const detail = await rawg.getGameBySlug(slug);
		return await resolveRawgResult(detail.id);
	} catch {
		return null;
	}
}

async function resolveRawgResult(
	rawgNumericId: number
): Promise<{ game: Game; justImported: boolean } | null> {
	const rawgId = String(rawgNumericId);

	const existingExternal = await gameExternalService.findByExternalId(
		"rawg",
		rawgId
	);
	if (existingExternal) {
		const game = await findGameById(existingExternal.gameId);
		return game ? { game, justImported: false } : null;
	}

	const rawgDetail = await rawg.getGameById(rawgNumericId);
	const mapped = rawgToGameMapper(rawgDetail);
	const existingByCode = await findGameByCode(titleToSlug(mapped.game.title));
	if (existingByCode) {
		await gameExternalService.create(existingByCode.id, "rawg", rawgId);
		return { game: existingByCode, justImported: false };
	}

	const game = await registerGame({
		...mapped.game,
		scores: mapped.enrichment.scores,
		times: mapped.enrichment.times,
		genres: mapped.enrichment.genreSlugs ?? []
	});

	await gameExternalService.create(game.id, "rawg", rawgId);

	return { game, justImported: true };
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
