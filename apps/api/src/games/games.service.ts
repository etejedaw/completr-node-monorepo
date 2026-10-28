import { type Transaction } from "sequelize";

import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { apiKeysConfig } from "../common/config/api-keys.config";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { ServiceError } from "../common/errors/service-error";
import { PinoLogger } from "../common/logger/pino.logger";
import {
	buildTextSearchRelevanceOrder,
	buildTextSearchWhere
} from "../common/utils/text-search.util";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import * as coopRunsService from "../coop-runs/coop-runs.service";
import { sequelize } from "../database/sequelize.database";
import * as favoritesService from "../favorites/favorites.service";
import * as gameExternalService from "../game-external/game-external.service";
import * as gameGenresService from "../game-genre/game-genre.service";
import * as gamePlatformsService from "../game-platform/game-platform.service";
import * as gamePlatinumService from "../game-platinum/game-platinum.service";
import * as gameScoresService from "../game-scores/game-scores.service";
import * as gameShelfService from "../game-shelf/game-shelf.service";
import * as gameTimesService from "../game-times/game-times.service";
import * as genresService from "../genres/genres.service";
import * as listItemsService from "../list-items/list-items.service";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import * as platformsService from "../platforms/platforms.service";
import * as rawgServiceError from "../rawg/errors/rawg.service-error";
import { RawgClient } from "../rawg/rawg.provider";
import * as reviewsService from "../reviews/reviews.service";
import * as scoreSourcesService from "../score-sources/score-sources.service";
import * as wishlistService from "../wishlist/wishlist.service";
import { type RegisterGameDto } from "./dtos/register-game.dto";
import { type UpdateGameDto } from "./dtos/update-game.dto";
import * as gamesServiceError from "./errors/games.service-error";
import { Game } from "./game.model";
import {
	type GameScoreEntry,
	rawgToGameMapper
} from "./mappers/rawg-to-game.mapper";
import {
	findGameByCode,
	findGameById,
	GAME_TITLE_COLUMN
} from "./services/games-search.service";
import { assertVariantConsistency } from "./services/games-variant.service";

export type {
	GamesQueryOptions,
	SetCompilationItemInput,
	SplitVariantInput
} from "./games.interface";
export {
	clearCompilation,
	existsActiveCompilation,
	findCompilationItemsByParent,
	findCompilationParentsForChild,
	gameBelongsToCompilation,
	setCompilationItems
} from "./services/games-compilation.service";
export {
	assignFranchiseToGames,
	clearFranchiseFromGames,
	countActiveGamesByFranchiseIds,
	existsGameById,
	findActiveGameSummaries,
	findAll,
	findExistingGameIds,
	findFranchiseIdsForGameIds,
	findGameByCode,
	findGameById,
	findGameIdsByFranchiseId,
	findGameRecordById,
	findGamesByFranchiseId,
	findGamesByGenreCode,
	findGamesByIds,
	findLatestReviewed,
	rawgDetail,
	rawgDetailBySlug,
	rawgLookup,
	searchGamesLocal
} from "./services/games-search.service";
export { findShowcaseGames } from "./services/games-showcase.service";
export { splitGame } from "./services/games-variant.service";

const rawg = RawgClient.create(apiKeysConfig.RAWG_API_KEY);
const logger = new PinoLogger("GamesService");

export async function registerGame(registerGameDto: RegisterGameDto) {
	if (registerGameDto.externalIds && registerGameDto.externalIds.length > 0) {
		await assertVariantConsistency(
			registerGameDto.externalIds,
			registerGameDto.variant ?? null,
			null
		);
	}

	await assertScoreSourcesExist(registerGameDto.scores);
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

	if (updateGameDto.parentGameId === game.id)
		throw gamesServiceError.validationError(
			new Error("A game cannot be its own parent")
		);

	const updateData: Record<string, unknown> = { ...gameDto };
	if (updateGameDto.isDlc === false) updateData.parentGameId = null;
	if (title) {
		const code = titleToSlug(title);
		if (!code)
			throw gamesServiceError.validationError(
				new Error("Title must contain at least one slug-safe character")
			);
		updateData.title = title;
		updateData.code = code;
	}

	const platformIds = platforms
		? await resolvePlatformIds(platforms)
		: undefined;
	const genreIds = genres ? await resolveGenreIds(genres) : undefined;

	await sequelize.transaction(async transaction => {
		try {
			await game.update(updateData, { transaction });
		} catch (error) {
			rethrowSequelizeError(error, {
				unique: gamesServiceError.uniqueConstraintError,
				validation: gamesServiceError.validationError
			});
		}

		if (platformIds)
			await gamePlatformsService.replaceGamePlatforms(
				game.id,
				platformIds,
				transaction
			);
		if (genreIds)
			await gameGenresService.replaceGameGenres(
				game.id,
				genreIds,
				transaction
			);
		if (externalIds)
			await upsertExternalIds(game.id, externalIds, transaction);
	});

	const updatedGame = await findGameById(id);
	return updatedGame as Game;
}

export async function deactivateGame(id: string) {
	const game = await findGameById(id);
	if (!game) throw gamesServiceError.notFoundError();

	await game.update({ isActive: false });
}

export async function reactivateGame(id: string) {
	const game = await Game.findOne({ where: { id } });
	if (!game) return false;

	await game.update({ isActive: true });
	return true;
}

export async function hardDeleteGame(id: string) {
	try {
		return await sequelize.transaction(async transaction => {
			const game = await Game.findOne({ where: { id }, transaction });
			if (!game) throw gamesServiceError.notFoundError();

			if (await isGameInUse(id, transaction))
				throw gamesServiceError.inUseError(undefined);

			await Game.destroy({ where: { id }, transaction });
			return true;
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			foreignKey: gamesServiceError.inUseError
		});
	}
}

async function isGameInUse(gameId: string, transaction: Transaction) {
	const lookups = [
		() => backlogService.existsByGameId(gameId, transaction),
		() => gameShelfService.existsByGameId(gameId, transaction),
		() => listItemsService.existsByGameId(gameId, transaction),
		() => favoritesService.existsByGameId(gameId, transaction),
		() => wishlistService.existsByGameId(gameId, transaction),
		() => reviewsService.existsByGameId(gameId, transaction),
		() => coopRunsService.existsByGameId(gameId, transaction),
		() => moodTagsService.existsByGameId(gameId, transaction),
		() => gamePlatinumService.existsByGameId(gameId, transaction),
		() => activityService.existsByGameId(gameId, transaction),
		() => backlogService.existsByCompilationGameId(gameId, transaction),
		async () =>
			(await Game.count({
				where: { parentGameId: gameId },
				transaction
			})) > 0
	];
	for (const lookup of lookups) {
		if (await lookup()) return true;
	}
	return false;
}

export async function searchGames(query: string, forceRawg = false) {
	if (!forceRawg) {
		const titleWhere = buildTextSearchWhere(query, [GAME_TITLE_COLUMN]);
		if (titleWhere) {
			const localResults = await Game.findAll({
				where: {
					isActive: true,
					...titleWhere
				},
				order: buildTextSearchRelevanceOrder(query, GAME_TITLE_COLUMN),
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

	return searchAndCreateFromRawg(query, forceRawg);
}

async function searchAndCreateFromRawg(query: string, forceRawg: boolean) {
	const importedIds = new Set<string>();
	if (!rawg.isEnabled) return { games: [] as Game[], importedIds };

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
		if (forceRawg) {
			throw error instanceof ServiceError
				? error
				: rawgServiceError.requestError(error);
		}
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
		scores: await keepCatalogedScores(mapped.enrichment.scores, rawgId),
		times: mapped.enrichment.times,
		genres: mapped.enrichment.genreSlugs ?? []
	});

	await gameExternalService.create(game.id, "rawg", rawgId);

	return { game, justImported: true };
}

async function upsertExternalIds(
	gameId: string,
	externalIds: UpdateGameDto["externalIds"],
	transaction?: Transaction
) {
	if (!externalIds) return;
	await gameExternalService.upsertMany(gameId, externalIds, transaction);
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

async function assertScoreSourcesExist(scores: RegisterGameDto["scores"]) {
	if (!scores?.length) return;
	const sources = scores.map(score => score.source);
	const existing = await scoreSourcesService.findExistingCodes(sources);
	const missing = sources.filter(source => !existing.has(source));
	if (missing.length > 0)
		throw gamesServiceError.scoreSourceNotFoundError(missing);
}

async function keepCatalogedScores(
	scores: GameScoreEntry[] | undefined,
	rawgId: string
): Promise<GameScoreEntry[]> {
	if (!scores?.length) return [];
	const existing = await scoreSourcesService.findExistingCodes(
		scores.map(score => score.source)
	);
	const skipped = scores.filter(score => !existing.has(score.source));
	if (skipped.length > 0)
		logger.warn("importFromRawg", "score skipped: unknown source", {
			rawgId,
			sources: skipped.map(score => score.source)
		});
	return scores.filter(score => existing.has(score.source));
}

async function createScores(
	gameId: string,
	scores: RegisterGameDto["scores"],
	transaction?: Transaction
) {
	if (!scores) return;
	await gameScoresService.createGameScores(
		scores.map(score => ({ gameId, ...score })),
		transaction
	);
}

async function createTimes(
	gameId: string,
	times: RegisterGameDto["times"],
	transaction?: Transaction
) {
	if (!times) return;
	await gameTimesService.createGameTimes(
		times.map(time => ({ gameId, ...time })),
		transaction
	);
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

async function resolvePlatformIds(platforms: string[]) {
	if (platforms.length === 0) return [];

	const platformDb = await platformsService.findPlatformsByCode(platforms);
	if (platformDb.length !== platforms.length)
		throw gamesServiceError.platformNotFoundError();

	return platformDb.map(platform => platform.id);
}

async function resolveGenreIds(genres: string[]) {
	if (genres.length === 0) return [];

	const genreDb = await genresService.findGenresByCode(genres);
	if (genreDb.length !== genres.length)
		throw gamesServiceError.genreNotFoundError();

	return genreDb.map(genre => genre.id);
}
