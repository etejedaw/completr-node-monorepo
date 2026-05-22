import {
	Op,
	Order,
	Transaction,
	UniqueConstraintError,
	ValidationError,
	WhereOptions,
	fn,
	col,
	where as whereFn
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
import { GameExternal } from "../game-external/game-external.model";
import { CompilationItem } from "../compilation-items/compilation-item.model";
import * as reviewsService from "../reviews/reviews.service";
import { RawgProvider } from "../rawg/rawg.provider";
import { RawgGameDetail } from "../rawg/rawg.interface";
import { apiKeysConfig } from "../common/config/api-keys.config";
import { titleToSlug } from "../common/utils/title-to-slug.util";
import { rawgToGameMapper } from "./mappers/rawg-to-game.mapper";
import { PinoLogger } from "../common/logger/pino.logger";

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
			{ association: "ParentGame" },
			{
				association: "CompilationItems",
				include: [
					{
						association: "ChildGame",
						where: { isActive: true },
						required: false
					}
				]
			},
			{
				association: "PartOfCompilations",
				include: [
					{
						association: "ParentGame",
						where: { isActive: true },
						required: true
					}
				]
			}
		],
		order: [[sequelize.literal('"CompilationItems"."position"'), "ASC"]]
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
	search?: string;
	genre?: string;
	genres?: readonly string[];
	platforms?: readonly string[];
	release_year_from?: number;
	release_year_to?: number;
	min_score?: number;
	max_score?: number;
	min_duration?: number;
	max_duration?: number;
	is_dlc?: boolean;
	is_compilation?: boolean;
	exclude_compilations?: boolean;
	include_inactive?: boolean;
	only_inactive?: boolean;
	no_scores?: boolean;
	no_times?: boolean;
	no_platforms?: boolean;
	no_score_source?: readonly string[];
	no_time_source?: readonly string[];
}

export async function findAll(options: GamesQueryOptions = {}) {
	const {
		limit = 50,
		offset = 0,
		sort_by = "createdAt",
		sort_order = "desc",
		search,
		genre,
		genres,
		platforms,
		release_year_from,
		release_year_to,
		min_score,
		max_score,
		min_duration,
		max_duration,
		is_dlc,
		is_compilation,
		exclude_compilations,
		include_inactive,
		only_inactive,
		no_scores,
		no_times,
		no_platforms,
		no_score_source,
		no_time_source
	} = options;

	const where: Record<string, unknown> = {};
	if (only_inactive) {
		where["isActive"] = false;
	} else if (!include_inactive) {
		where["isActive"] = true;
	}
	const andConditions: object[] = [];
	const include: { association: string; where?: Record<string, unknown> }[] =
		[
			{ association: "Platforms" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		];

	if (search) {
		const titleWhere = buildTitleSearchWhere(search);
		if (titleWhere) andConditions.push(titleWhere);
	}

	if (is_dlc !== undefined) {
		where["isDlc"] = is_dlc;
	}

	if (is_compilation !== undefined) {
		where["isCompilation"] = is_compilation;
	} else if (exclude_compilations) {
		where["isCompilation"] = false;
	}

	if (release_year_from !== undefined || release_year_to !== undefined) {
		const range: Record<symbol, Date> = {};
		if (release_year_from !== undefined) {
			range[Op.gte] = new Date(`${release_year_from}-01-01`);
		}
		if (release_year_to !== undefined) {
			range[Op.lte] = new Date(`${release_year_to}-12-31`);
		}
		where["releaseAt"] = range;
	}

	const genreCodes =
		genres && genres.length > 0 ? genres : genre ? [genre] : null;
	if (genreCodes) {
		const escaped = genreCodes.map(g => sequelize.escape(g)).join(", ");
		andConditions.push({
			id: {
				[Op.in]: sequelize.literal(
					`(SELECT DISTINCT gg."gameId" FROM "GameGenres" gg JOIN "Genres" g ON g.id = gg."genreId" WHERE g.code IN (${escaped}))`
				)
			}
		});
	}

	if (platforms && platforms.length > 0) {
		const escaped = platforms.map(p => sequelize.escape(p)).join(", ");
		andConditions.push({
			id: {
				[Op.in]: sequelize.literal(
					`(SELECT DISTINCT gp."gameId" FROM "GamePlatforms" gp JOIN "Platforms" p ON p.id = gp."platformId" WHERE p.code IN (${escaped}))`
				)
			}
		});
	}

	if (min_score !== undefined || max_score !== undefined) {
		const conditions: string[] = [];
		if (min_score !== undefined)
			conditions.push(`AVG(score) >= ${min_score}`);
		if (max_score !== undefined)
			conditions.push(`AVG(score) <= ${max_score}`);
		andConditions.push({
			id: {
				[Op.in]: sequelize.literal(
					`(SELECT "gameId" FROM "GameScores" GROUP BY "gameId" HAVING ${conditions.join(" AND ")})`
				)
			}
		});
	}

	if (min_duration !== undefined || max_duration !== undefined) {
		const conditions: string[] = [];
		if (min_duration !== undefined)
			conditions.push(`AVG(duration) >= ${min_duration}`);
		if (max_duration !== undefined)
			conditions.push(`AVG(duration) <= ${max_duration}`);
		andConditions.push({
			id: {
				[Op.in]: sequelize.literal(
					`(SELECT "gameId" FROM "GameTimes" GROUP BY "gameId" HAVING ${conditions.join(" AND ")})`
				)
			}
		});
	}

	include.push({ association: "Genres" });

	if (no_scores) {
		andConditions.push({
			id: {
				[Op.notIn]: sequelize.literal(
					'(SELECT DISTINCT "gameId" FROM "GameScores")'
				)
			}
		});
	}

	if (no_times) {
		andConditions.push({
			id: {
				[Op.notIn]: sequelize.literal(
					'(SELECT DISTINCT "gameId" FROM "GameTimes")'
				)
			}
		});
	}

	if (no_platforms) {
		andConditions.push({
			id: {
				[Op.notIn]: sequelize.literal(
					'(SELECT DISTINCT "gameId" FROM "GamePlatforms")'
				)
			}
		});
	}

	if (no_score_source && no_score_source.length > 0) {
		const escaped = no_score_source
			.map(s => sequelize.escape(s))
			.join(", ");
		andConditions.push({
			id: {
				[Op.notIn]: sequelize.literal(
					`(SELECT DISTINCT "gameId" FROM "GameScores" WHERE source IN (${escaped}))`
				)
			}
		});
	}

	if (no_time_source && no_time_source.length > 0) {
		const escaped = no_time_source.map(s => sequelize.escape(s)).join(", ");
		andConditions.push({
			id: {
				[Op.notIn]: sequelize.literal(
					`(SELECT DISTINCT "gameId" FROM "GameTimes" WHERE source IN (${escaped}))`
				)
			}
		});
	}

	if (andConditions.length > 0) {
		where[Op.and as unknown as string] = andConditions;
	}

	const order: Order =
		sort_by === "random"
			? [sequelize.literal("RANDOM()")]
			: [[sort_by, sort_order.toUpperCase()]];

	const { rows, count } = await Game.findAndCountAll({
		where,
		include,
		order,
		limit,
		offset,
		distinct: true
	});

	return { games: rows, total: count };
}

export async function findLatestReviewed(limit = 16) {
	const gameIds = await reviewsService.findLatestReviewedGameIds(limit);
	if (gameIds.length === 0) return [];

	const games = await Game.findAll({
		where: { id: { [Op.in]: gameIds }, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "GameScores" },
			{ association: "GameTimes" },
			{ association: "Genres" }
		]
	});

	const gameMap = new Map(games.map(g => [g.id, g]));
	return gameIds
		.map(id => gameMap.get(id))
		.filter((g): g is Game => g !== undefined);
}

function buildTitleSearchWhere(query: string): WhereOptions | null {
	const normalized = query
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!normalized) return null;
	const tokens = normalized
		.split(" ")
		.map(t => t.replace(/[^a-z0-9]/g, ""))
		.filter(t => t.length > 0);
	if (tokens.length === 0) return null;
	const normalizedTitle = fn(
		"regexp_replace",
		fn("lower", fn("unaccent", col("title"))),
		"[^a-z0-9]",
		"",
		"g"
	);
	return {
		[Op.and]: tokens.map(token =>
			whereFn(normalizedTitle, Op.like, `%${token}%`)
		)
	};
}

export async function searchGamesLocal(query: string) {
	const titleWhere = buildTitleSearchWhere(query);
	if (!titleWhere) return [];
	return Game.findAll({
		where: {
			isActive: true,
			...titleWhere
		},
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		],
		limit: 10
	});
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

export async function findGamesByGenreCode(
	genreCode: string,
	options: { limit?: number; offset?: number } = {}
) {
	const { limit = 50, offset = 0 } = options;
	const rows = await Game.findAll({
		where: { isActive: true },
		include: [
			{ association: "Platforms" },
			{
				association: "Genres",
				where: { code: genreCode }
			},
			{ association: "GameScores" },
			{ association: "GameTimes" }
		],
		limit: limit + 1,
		offset
	});
	const hasMore = rows.length > limit;
	return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
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
		updateData.title = title;
		updateData.code = titleToSlug(title);
	}

	await game.update(updateData);

	const updatedGame = await findGameById(id);
	return updatedGame as Game;
}

async function assertVariantConsistency(
	externalIds: readonly { source: string; externalId: string }[],
	variant: string | null,
	currentGameId: string | null
) {
	for (const { source, externalId } of externalIds) {
		const siblings = await GameExternal.findAll({
			where: { source, externalId },
			include: [{ association: "Game" }]
		});
		const otherSiblings = siblings.filter(s => s.gameId !== currentGameId);
		if (otherSiblings.length === 0) continue;
		if (!variant || variant.trim().length === 0) {
			throw gamesServiceError.variantRequiredError();
		}
		for (const sibling of otherSiblings) {
			const siblingGame = await Game.findByPk(sibling.gameId);
			if (
				!siblingGame?.variant ||
				siblingGame.variant.trim().length === 0
			) {
				throw gamesServiceError.variantRequiredError();
			}
		}
	}
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

export interface SplitVariantInput {
	title: string;
	variant: string;
}

export async function splitGame(
	gameId: string,
	variants: readonly SplitVariantInput[]
) {
	const original = await Game.findOne({
		where: { id: gameId, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" },
			{ association: "GameExternals" }
		]
	});
	if (!original) throw gamesServiceError.notFoundError();

	const codes = new Set<string>();
	for (const v of variants) {
		const code = titleToSlug(v.title);
		if (codes.has(code)) throw gamesServiceError.splitInvalidError();
		codes.add(code);
	}

	const platformIds = original.Platforms.map(p => p.id);
	const genreIds = original.Genres.map(g => g.id);
	const scores = original.GameScores.map(s => ({
		source: s.source,
		score: s.score
	}));
	const times = original.GameTimes.map(t => ({
		source: t.source,
		duration: t.duration
	}));
	const externals = original.GameExternals.map(e => ({
		source: e.source,
		externalId: e.externalId
	}));

	if (variants.length < 2) throw gamesServiceError.splitInvalidError();
	const [firstVariant, ...restVariants] = variants as [
		SplitVariantInput,
		...SplitVariantInput[]
	];

	const transaction = await sequelize.transaction();
	try {
		await original.update(
			{
				title: firstVariant.title,
				code: titleToSlug(firstVariant.title),
				variant: firstVariant.variant
			},
			{ transaction }
		);

		const createdIds: string[] = [original.id];

		for (const v of restVariants) {
			const newGame = await Game.create(
				{
					title: v.title,
					code: titleToSlug(v.title),
					description: original.description,
					releaseAt: original.releaseAt,
					coverUrl: original.coverUrl,
					backgroundUrl: original.backgroundUrl,
					isDlc: original.isDlc,
					parentGameId: original.parentGameId,
					variant: v.variant
				},
				{ transaction }
			);

			if (platformIds.length > 0) {
				await gamePlatformsService.linkGameToPlatforms(
					newGame.id,
					platformIds,
					transaction
				);
			}
			if (genreIds.length > 0) {
				await gameGenresService.linkGameToGenres(
					newGame.id,
					genreIds,
					transaction
				);
			}
			for (const s of scores) {
				await gameScoresService.createGameScore(
					newGame.id,
					s.source,
					s.score,
					transaction
				);
			}
			for (const t of times) {
				await gameTimesService.createGameTime(
					newGame.id,
					t.source,
					t.duration,
					transaction
				);
			}
			for (const e of externals) {
				await GameExternal.create(
					{
						gameId: newGame.id,
						source: e.source,
						externalId: e.externalId
					},
					{ transaction }
				);
			}

			createdIds.push(newGame.id);
		}

		await transaction.commit();

		const refreshed = await Promise.all(
			createdIds.map(id => findGameById(id))
		);
		return refreshed.filter((g): g is Game => g !== null);
	} catch (error) {
		await transaction.rollback();
		if (error instanceof UniqueConstraintError)
			throw gamesServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw gamesServiceError.validationError(error);
		throw error;
	}
}

export type SetCompilationItemInput =
	| { mode: "link"; gameId: string }
	| { mode: "create"; title: string };

export async function setCompilationItems(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
	if (!parent) throw gamesServiceError.notFoundError();

	const inheritedPlatformIds = parent.Platforms?.map(p => p.id) ?? [];
	const inheritedGenreIds = parent.Genres?.map(g => g.id) ?? [];
	const inheritedScores =
		parent.GameScores?.map(s => ({ source: s.source, score: s.score })) ??
		[];
	const inheritedTimes =
		parent.GameTimes?.map(t => ({
			source: t.source,
			duration: t.duration
		})) ?? [];

	for (const item of items) {
		if (item.mode === "link" && item.gameId === parentGameId) {
			throw gamesServiceError.compilationInvalidError();
		}
	}

	const linkedIds = items
		.filter(i => i.mode === "link")
		.map(i => (i as { gameId: string }).gameId);
	if (new Set(linkedIds).size !== linkedIds.length) {
		throw gamesServiceError.compilationInvalidError();
	}

	const createdSlugs = items
		.filter(i => i.mode === "create")
		.map(i => titleToSlug((i as { title: string }).title));
	if (new Set(createdSlugs).size !== createdSlugs.length) {
		throw gamesServiceError.compilationInvalidError();
	}

	if (linkedIds.length > 0) {
		const found = await Game.findAll({
			where: { id: linkedIds, isActive: true }
		});
		if (found.length !== linkedIds.length) {
			throw gamesServiceError.notFoundError();
		}
	}

	const transaction = await sequelize.transaction();
	try {
		await CompilationItem.destroy({
			where: { parentGameId },
			transaction
		});

		const resolvedChildIds: string[] = [];
		for (const item of items) {
			if (item.mode === "link") {
				resolvedChildIds.push(item.gameId);
			} else {
				const child = await Game.create(
					{
						title: item.title,
						code: titleToSlug(item.title),
						description: parent.description,
						releaseAt: parent.releaseAt,
						coverUrl: parent.coverUrl,
						backgroundUrl: parent.backgroundUrl,
						isDlc: false,
						isCompilation: false
					},
					{ transaction }
				);
				if (inheritedPlatformIds.length > 0) {
					await gamePlatformsService.linkGameToPlatforms(
						child.id,
						inheritedPlatformIds,
						transaction
					);
				}
				if (inheritedGenreIds.length > 0) {
					await gameGenresService.linkGameToGenres(
						child.id,
						inheritedGenreIds,
						transaction
					);
				}
				for (const s of inheritedScores) {
					await gameScoresService.createGameScore(
						child.id,
						s.source,
						s.score,
						transaction
					);
				}
				for (const t of inheritedTimes) {
					await gameTimesService.createGameTime(
						child.id,
						t.source,
						t.duration,
						transaction
					);
				}
				resolvedChildIds.push(child.id);
			}
		}

		if (new Set(resolvedChildIds).size !== resolvedChildIds.length) {
			throw gamesServiceError.compilationInvalidError();
		}

		for (let i = 0; i < resolvedChildIds.length; i++) {
			await CompilationItem.create(
				{
					parentGameId,
					childGameId: resolvedChildIds[i],
					position: i
				},
				{ transaction }
			);
		}

		await parent.update({ isCompilation: true }, { transaction });

		await transaction.commit();

		return await findCompilationItemsByParent(parentGameId);
	} catch (error) {
		await transaction.rollback();
		if (error instanceof UniqueConstraintError)
			throw gamesServiceError.uniqueConstraintError(error);
		if (error instanceof ValidationError)
			throw gamesServiceError.validationError(error);
		throw error;
	}
}

export async function clearCompilation(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true }
	});
	if (!parent) throw gamesServiceError.notFoundError();

	const transaction = await sequelize.transaction();
	try {
		await CompilationItem.destroy({
			where: { parentGameId },
			transaction
		});
		await parent.update({ isCompilation: false }, { transaction });
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

export async function findCompilationItemsByParent(parentGameId: string) {
	return CompilationItem.findAll({
		where: { parentGameId },
		include: [
			{
				association: "ChildGame",
				include: [
					{ association: "Platforms" },
					{ association: "GameScores" },
					{ association: "GameTimes" },
					{ association: "Genres" }
				]
			}
		],
		order: [["position", "ASC"]]
	});
}

export async function findCompilationParentsForChild(childGameId: string) {
	return CompilationItem.findAll({
		where: { childGameId },
		include: [
			{
				association: "ParentGame",
				where: { isActive: true },
				required: true
			}
		],
		order: [["createdAt", "ASC"]]
	});
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
