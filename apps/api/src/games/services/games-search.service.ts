import {
	col,
	fn,
	type Includeable,
	Op,
	type Order,
	type Transaction,
	type WhereOptions
} from "sequelize";

import {
	buildTextSearchRelevanceOrder,
	buildTextSearchWhere
} from "../../common/utils/text-search.util";
import { sequelize } from "../../database/sequelize.database";
import * as reviewsService from "../../reviews/reviews.service";
import { Game } from "../game.model";
import {
	DEFAULT_GAMES_PAGE_SIZE,
	DEFAULT_LATEST_REVIEWED_LIMIT,
	LOCAL_SEARCH_LIMIT
} from "../games.constants";
import {
	type GamesFilters,
	type GamesQueryOptions,
	type PagedGamesOptions
} from "../games.interface";
import { buildActiveFlagWhere } from "../utils/build-active-flag-where.util";
import { buildAggregateCondition } from "../utils/build-aggregate-condition.util";
import { buildCanonicalScoreCondition } from "../utils/build-canonical-score-condition.util";
import { buildCatalogIncludes } from "../utils/build-catalog-includes.util";
import { buildCompilationFlagsWhere } from "../utils/build-compilation-flags-where.util";
import { buildGenreCondition } from "../utils/build-genre-condition.util";
import { buildMissingRelationCondition } from "../utils/build-missing-relation-condition.util";
import { buildOrder } from "../utils/build-order.util";
import { buildPlatformCondition } from "../utils/build-platform-condition.util";
import { buildReleaseDateRangeWhere } from "../utils/build-release-date-range-where.util";
import { buildSourceExclusionCondition } from "../utils/build-source-exclusion-condition.util";
import { withIdTieBreaker } from "../utils/with-id-tie-breaker.util";
export const GAME_TITLE_COLUMN = "Game.title";

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

const GAME_ADMIN_LIST_ATTRS = [...GAME_LIST_ATTRS, "variant", "isActive"];

export async function findGameByCode(code: string) {
	return await Game.findOne({
		where: { code, isActive: true },
		include: [
			{ association: "Platforms", attributes: PLATFORM_ATTRS },
			{ association: "Genres", attributes: GENRE_ATTRS },
			{ association: "GameScores", attributes: GAME_SCORE_ATTRS },
			{ association: "GameTimes", attributes: GAME_TIME_ATTRS },
			{ association: "GameExternals", attributes: GAME_EXTERNAL_ATTRS },
			{ association: "Franchise", attributes: ["id", "name", "code"] },
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

export async function findGameRecordById(id: string) {
	return Game.findOne({ where: { id } });
}

export async function existsGameById(id: string, transaction?: Transaction) {
	return (await Game.count({ where: { id }, transaction })) > 0;
}

export async function findExistingGameIds(
	ids: string[],
	transaction?: Transaction
) {
	const games = await Game.findAll({
		where: { id: { [Op.in]: ids } },
		attributes: ["id"],
		transaction
	});
	return games.map(game => game.id);
}

export async function clearFranchiseFromGames(
	franchiseId: string,
	keptGameIds: string[],
	transaction: Transaction
) {
	const keptGamesFilter =
		keptGameIds.length > 0 ? { id: { [Op.notIn]: keptGameIds } } : {};
	await Game.update(
		{ franchiseId: null },
		{ where: { franchiseId, ...keptGamesFilter }, transaction }
	);
}

export async function assignFranchiseToGames(
	franchiseId: string,
	gameIds: string[],
	transaction: Transaction
) {
	await Game.update(
		{ franchiseId },
		{ where: { id: { [Op.in]: gameIds } }, transaction }
	);
}

export async function findActiveGameSummaries() {
	return Game.findAll({
		where: { isActive: true },
		attributes: ["id", "code"]
	});
}

export async function findActiveGamesForExternalData() {
	return Game.findAll({
		where: { isActive: true },
		attributes: ["id", "title", "code", "variant", "releaseAt"],
		order: [
			["title", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function findGameById(id: string) {
	return await Game.findOne({
		where: { id, isActive: true },
		include: [...buildCatalogIncludes(), { association: "Franchise" }]
	});
}

export async function findAll(options: GamesQueryOptions = {}) {
	const { limit = DEFAULT_GAMES_PAGE_SIZE, offset = 0 } =
		options.pagination ?? {};
	const { by: sortBy = "createdAt", order: sortOrder = "desc" } =
		options.sort ?? {};
	const filters = options.filters ?? {};

	const andConditions = collectAndConditions(options.search, filters);
	const where: WhereOptions = {
		...buildActiveFlagWhere(filters.status),
		...buildCompilationFlagsWhere(filters.flags),
		...buildReleaseDateRangeWhere(
			filters.releaseYear?.from,
			filters.releaseYear?.to
		),
		...(andConditions.length > 0 && { [Op.and]: andConditions })
	};

	const include: Includeable[] = [
		{ association: "Genres", attributes: GENRE_ATTRS },
		{ association: "GameScores", attributes: GAME_SCORE_ATTRS },
		{ association: "GameTimes", attributes: GAME_TIME_ATTRS }
	];
	if (options.detailed) {
		include.push({ association: "Platforms", attributes: PLATFORM_ATTRS });
	}

	const { rows, count } = await Game.findAndCountAll({
		where,
		attributes: options.detailed ? GAME_ADMIN_LIST_ATTRS : GAME_LIST_ATTRS,
		include,
		order: withIdTieBreaker(buildOrder(sortBy, sortOrder), sortOrder),
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

	if (search)
		conditions.push(buildTextSearchWhere(search, [GAME_TITLE_COLUMN]));

	conditions.push(buildGenreCondition(filters.genres));
	conditions.push(buildPlatformCondition(filters.platforms));
	conditions.push(
		buildCanonicalScoreCondition(filters.score?.min, filters.score?.max)
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

export async function findLatestReviewed(
	limit = DEFAULT_LATEST_REVIEWED_LIMIT
) {
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

export async function findGamesByTitle(query: string, limit?: number) {
	const titleWhere = buildTextSearchWhere(query, [GAME_TITLE_COLUMN]);
	if (!titleWhere) return [];
	return Game.findAll({
		where: {
			isActive: true,
			...titleWhere
		},
		order: buildTextSearchRelevanceOrder(query, GAME_TITLE_COLUMN),
		include: buildCatalogIncludes(),
		limit
	});
}

export async function searchGamesLocal(query: string) {
	return findGamesByTitle(query, LOCAL_SEARCH_LIMIT);
}

async function findPagedGames(
	where: WhereOptions,
	order: Order,
	{ limit = DEFAULT_GAMES_PAGE_SIZE, offset = 0 }: PagedGamesOptions
) {
	const rows = await Game.findAll({
		where: { isActive: true, ...where },
		include: buildCatalogIncludes(),
		order,
		limit: limit + 1,
		offset
	});
	const hasMore = rows.length > limit;
	return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

export async function findGamesByGenreCode(
	genreCode: string,
	options: PagedGamesOptions = {}
) {
	return findPagedGames(
		(buildGenreCondition([genreCode]) ?? {}) as WhereOptions,
		[
			["title", "ASC"],
			["id", "ASC"]
		],
		options
	);
}

export async function findGamesByFranchiseId(
	franchiseId: string,
	options: PagedGamesOptions = {}
) {
	return findPagedGames(
		{ franchiseId },
		[
			["releaseAt", "ASC"],
			["id", "ASC"]
		],
		options
	);
}

export async function findGameIdsByFranchiseId(franchiseId: string) {
	const rows = await Game.findAll({
		where: { isActive: true, franchiseId },
		attributes: ["id"]
	});
	return rows.map(row => row.id);
}

export async function findFranchiseIdsForGameIds(gameIds: string[]) {
	if (gameIds.length === 0) return [];
	const rows = (await Game.findAll({
		where: {
			id: { [Op.in]: gameIds },
			franchiseId: { [Op.ne]: null }
		},
		attributes: ["franchiseId"],
		raw: true
	})) as unknown as { franchiseId: string }[];
	return rows.map(row => row.franchiseId);
}

export async function countActiveGamesByFranchiseIds(franchiseIds: string[]) {
	if (franchiseIds.length === 0) return new Map<string, number>();
	const rows = (await Game.findAll({
		where: { isActive: true, franchiseId: { [Op.in]: franchiseIds } },
		attributes: ["franchiseId", [fn("COUNT", col("id")), "count"]],
		group: ["franchiseId"],
		raw: true
	})) as unknown as { franchiseId: string; count: string }[];

	const map = new Map<string, number>();
	for (const row of rows) map.set(row.franchiseId, Number(row.count));
	return map;
}
