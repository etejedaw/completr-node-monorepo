import { Op, type Order } from "sequelize";

import { buildRangeWhere } from "../../common/utils/sequelize-range.util";
import { sequelize } from "../../database/sequelize.database";
import {
	type GamesCompilationFlags,
	type GamesStatusFilters
} from "../games.interface";

export function buildActiveFlagWhere(
	status: GamesStatusFilters | undefined
): Record<string, unknown> {
	if (status?.onlyInactive) return { isActive: false };
	if (status?.includeInactive) return {};
	return { isActive: true };
}

export function buildCompilationFlagsWhere(
	flags: GamesCompilationFlags | undefined
): Record<string, unknown> {
	const where: Record<string, unknown> = {};
	if (!flags) return where;
	if (flags.isDlc !== undefined) where["isDlc"] = flags.isDlc;
	if (flags.isCompilation !== undefined) {
		where["isCompilation"] = flags.isCompilation;
	} else if (flags.excludeCompilations) {
		where["isCompilation"] = false;
	}
	return where;
}

export function buildReleaseDateRangeWhere(
	from: number | undefined,
	to: number | undefined
): Record<string, unknown> {
	const range = buildRangeWhere(
		from !== undefined ? new Date(`${from}-01-01`) : undefined,
		to !== undefined ? new Date(`${to}-12-31`) : undefined
	);
	return range ? { releaseAt: range } : {};
}

export function buildGenreCondition(
	codes: readonly string[] | undefined
): object | null {
	if (!codes || codes.length === 0) return null;
	const escaped = codes.map(c => sequelize.escape(c)).join(", ");
	return {
		id: {
			[Op.in]: sequelize.literal(
				`(SELECT DISTINCT gg."gameId" FROM "GameGenres" gg JOIN "Genres" g ON g.id = gg."genreId" WHERE g.code IN (${escaped}))`
			)
		}
	};
}

export function buildPlatformCondition(
	codes: readonly string[] | undefined
): object | null {
	if (!codes || codes.length === 0) return null;
	const escaped = codes.map(c => sequelize.escape(c)).join(", ");
	return {
		id: {
			[Op.in]: sequelize.literal(
				`(SELECT DISTINCT gp."gameId" FROM "GamePlatforms" gp JOIN "Platforms" p ON p.id = gp."platformId" WHERE p.code IN (${escaped}))`
			)
		}
	};
}

export function buildAggregateCondition(
	table: string,
	column: string,
	min: number | undefined,
	max: number | undefined
): object | null {
	if (min === undefined && max === undefined) return null;
	const conditions: string[] = [];
	if (min !== undefined) conditions.push(`AVG(${column}) >= ${min}`);
	if (max !== undefined) conditions.push(`AVG(${column}) <= ${max}`);
	return {
		id: {
			[Op.in]: sequelize.literal(
				`(SELECT "gameId" FROM "${table}" GROUP BY "gameId" HAVING ${conditions.join(" AND ")})`
			)
		}
	};
}

export function buildMissingRelationCondition(table: string): object {
	return {
		id: {
			[Op.notIn]: sequelize.literal(
				`(SELECT DISTINCT "gameId" FROM "${table}")`
			)
		}
	};
}

export function buildSourceExclusionCondition(
	table: string,
	sources: readonly string[] | undefined
): object | null {
	if (!sources || sources.length === 0) return null;
	const escaped = sources.map(s => sequelize.escape(s)).join(", ");
	return {
		id: {
			[Op.notIn]: sequelize.literal(
				`(SELECT DISTINCT "gameId" FROM "${table}" WHERE source IN (${escaped}))`
			)
		}
	};
}

const CANONICAL_SCORE_SUBQUERY = `(
	SELECT score FROM "GameScores" gs
	WHERE gs."gameId" = "Game"."id"
	ORDER BY CASE gs."source"
		WHEN 'completr' THEN 1
		WHEN 'metacritic' THEN 2
		WHEN 'opencritic' THEN 3
		WHEN 'rawg' THEN 4
		ELSE 99
	END
	LIMIT 1
)`;

const CANONICAL_DURATION_SUBQUERY = `(
	SELECT duration FROM "GameTimes" gt
	WHERE gt."gameId" = "Game"."id"
	ORDER BY CASE gt."source"
		WHEN 'completr' THEN 1
		WHEN 'hltb' THEN 2
		WHEN 'rawg' THEN 3
		ELSE 99
	END
	LIMIT 1
)`;

const POPULARITY_SUBQUERY = `(
	SELECT score FROM "GamePopularities" gp
	WHERE gp."gameId" = "Game"."id"
)`;

export function buildOrder(sortBy: string, sortOrder: string): Order {
	if (sortBy === "random") return [sequelize.literal("RANDOM()")];

	const dir = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
	const nulls = dir === "ASC" ? "NULLS LAST" : "NULLS LAST";

	if (sortBy === "score") {
		return [
			sequelize.literal(`${CANONICAL_SCORE_SUBQUERY} ${dir} ${nulls}`)
		];
	}
	if (sortBy === "duration") {
		return [
			sequelize.literal(`${CANONICAL_DURATION_SUBQUERY} ${dir} ${nulls}`)
		];
	}
	if (sortBy === "ratio") {
		return [
			sequelize.literal(
				`(${CANONICAL_SCORE_SUBQUERY} / NULLIF(${CANONICAL_DURATION_SUBQUERY}, 0)) ${dir} ${nulls}`
			)
		];
	}
	if (sortBy === "popularity") {
		return [sequelize.literal(`${POPULARITY_SUBQUERY} ${dir} ${nulls}`)];
	}

	return [[sortBy, dir]];
}
