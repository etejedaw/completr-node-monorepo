import { Op, Order, WhereOptions, fn, col, where as whereFn } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "./game.model";
import { GamesQueryOptions } from "./games.interface";
import * as reviewsService from "../reviews/reviews.service";
import { RawgProvider } from "../rawg/rawg.provider";
import { RawgGameDetail } from "../rawg/rawg.interface";
import { apiKeysConfig } from "../common/config/api-keys.config";
import { rawgToGameMapper } from "./mappers/rawg-to-game.mapper";

const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);

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
