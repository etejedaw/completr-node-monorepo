import { Op, WhereOptions, fn, col, where as whereFn } from "sequelize";
import { sequelize } from "../../database/sequelize.database";
import { Game } from "../game.model";
import { GamesFilters, GamesQueryOptions } from "../games.interface";
import {
	buildActiveFlagWhere,
	buildAggregateCondition,
	buildCompilationFlagsWhere,
	buildGenreCondition,
	buildMissingRelationCondition,
	buildOrder,
	buildPlatformCondition,
	buildReleaseDateRangeWhere,
	buildSourceExclusionCondition
} from "../utils/search-filters.util";
import * as reviewsService from "../../reviews/reviews.service";
import { RawgProvider } from "../../rawg/rawg.provider";
import { RawgGameDetail } from "../../rawg/rawg.interface";
import { apiKeysConfig } from "../../common/config/api-keys.config";
import { rawgToGameMapper } from "../mappers/rawg-to-game.mapper";

const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);

const GAME_SUMMARY_ATTRS = ["id", "code", "title", "backgroundUrl", "coverUrl"];
const PLATFORM_ATTRS = ["id", "name", "code", "abbreviation"];
const GENRE_ATTRS = ["id", "name", "code"];
const GAME_SCORE_ATTRS = ["gameId", "source", "score"];
const GAME_TIME_ATTRS = ["gameId", "source", "duration"];
const GAME_EXTERNAL_ATTRS = ["gameId", "source", "externalId"];
const COMPILATION_ITEM_ATTRS = [
	"id",
	"position",
	"childGameId",
	"parentGameId"
];

const GAME_LIST_ATTRS = [
	"id",
	"code",
	"title",
	"backgroundUrl",
	"isDlc",
	"createdAt",
	"releaseAt"
];

export async function findGameByCode(code: string) {
	return await Game.findOne({
		where: { code, isActive: true },
		include: [
			{ association: "Platforms", attributes: PLATFORM_ATTRS },
			{ association: "Genres", attributes: GENRE_ATTRS },
			{ association: "GameScores", attributes: GAME_SCORE_ATTRS },
			{ association: "GameTimes", attributes: GAME_TIME_ATTRS },
			{ association: "GameExternals", attributes: GAME_EXTERNAL_ATTRS },
			{
				association: "Dlcs",
				attributes: GAME_SUMMARY_ATTRS,
				where: { isActive: true },
				required: false
			},
			{ association: "ParentGame", attributes: GAME_SUMMARY_ATTRS },
			{
				association: "CompilationItems",
				attributes: COMPILATION_ITEM_ATTRS,
				include: [
					{
						association: "ChildGame",
						attributes: GAME_SUMMARY_ATTRS,
						where: { isActive: true },
						required: false
					}
				]
			},
			{
				association: "PartOfCompilations",
				attributes: COMPILATION_ITEM_ATTRS,
				include: [
					{
						association: "ParentGame",
						attributes: GAME_SUMMARY_ATTRS,
						where: { isActive: true },
						required: true
					}
				]
			}
		],
		order: [[sequelize.literal('"CompilationItems"."position"'), "ASC"]]
	});
}

export async function findGamesByIds(ids: string[]) {
	if (ids.length === 0) return [];
	return Game.findAll({ where: { id: ids } });
}

export async function findActiveGameSummaries() {
	return Game.findAll({
		where: { isActive: true },
		attributes: ["id", "code"]
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

export async function findAll(options: GamesQueryOptions = {}) {
	const { limit = 50, offset = 0 } = options.pagination ?? {};
	const { by: sortBy = "createdAt", order: sortOrder = "desc" } =
		options.sort ?? {};
	const filters = options.filters ?? {};

	const where: Record<string, unknown> = {
		...buildActiveFlagWhere(filters.status),
		...buildCompilationFlagsWhere(filters.flags),
		...buildReleaseDateRangeWhere(
			filters.releaseYear?.from,
			filters.releaseYear?.to
		)
	};

	const andConditions = collectAndConditions(options.search, filters);
	if (andConditions.length > 0) {
		where[Op.and as unknown as string] = andConditions;
	}

	const { rows, count } = await Game.findAndCountAll({
		where,
		attributes: GAME_LIST_ATTRS,
		include: [
			{ association: "Genres", attributes: GENRE_ATTRS },
			{ association: "GameScores", attributes: GAME_SCORE_ATTRS },
			{ association: "GameTimes", attributes: GAME_TIME_ATTRS }
		],
		order: buildOrder(sortBy, sortOrder),
		limit,
		offset,
		distinct: true
	});

	return { games: rows, total: count };
}

function collectAndConditions(
	search: string | undefined,
	filters: GamesFilters
): object[] {
	const conditions: (object | null)[] = [];

	if (search) conditions.push(buildTitleSearchWhere(search));

	conditions.push(buildGenreCondition(filters.genres));
	conditions.push(buildPlatformCondition(filters.platforms));
	conditions.push(
		buildAggregateCondition(
			"GameScores",
			"score",
			filters.score?.min,
			filters.score?.max
		)
	);
	conditions.push(
		buildAggregateCondition(
			"GameTimes",
			"duration",
			filters.duration?.min,
			filters.duration?.max
		)
	);

	if (filters.missing?.scores)
		conditions.push(buildMissingRelationCondition("GameScores"));
	if (filters.missing?.times)
		conditions.push(buildMissingRelationCondition("GameTimes"));
	if (filters.missing?.platforms)
		conditions.push(buildMissingRelationCondition("GamePlatforms"));

	conditions.push(
		buildSourceExclusionCondition(
			"GameScores",
			filters.excludedSources?.scoreSources
		)
	);
	conditions.push(
		buildSourceExclusionCondition(
			"GameTimes",
			filters.excludedSources?.timeSources
		)
	);

	return conditions.filter((c): c is object => c !== null);
}

export async function findLatestReviewed(limit = 16) {
	const gameIds = await reviewsService.findLatestReviewedGameIds(limit);
	if (gameIds.length === 0) return [];

	const games = await Game.findAll({
		where: { id: { [Op.in]: gameIds }, isActive: true },
		attributes: GAME_LIST_ATTRS,
		include: [
			{ association: "Genres", attributes: GENRE_ATTRS },
			{ association: "GameScores", attributes: GAME_SCORE_ATTRS },
			{ association: "GameTimes", attributes: GAME_TIME_ATTRS }
		]
	});

	const gameMap = new Map(games.map(g => [g.id, g]));
	return gameIds
		.map(id => gameMap.get(id))
		.filter((g): g is Game => g !== undefined);
}

export function buildTitleSearchWhere(query: string): WhereOptions | null {
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
