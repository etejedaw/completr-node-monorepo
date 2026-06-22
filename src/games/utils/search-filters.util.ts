import { Op, Order } from "sequelize";
import { sequelize } from "../../database/sequelize.database";
import { GamesCompilationFlags, GamesStatusFilters } from "../games.interface";

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
	if (from === undefined && to === undefined) return {};
	const range: Record<symbol, Date> = {};
	if (from !== undefined) range[Op.gte] = new Date(`${from}-01-01`);
	if (to !== undefined) range[Op.lte] = new Date(`${to}-12-31`);
	return { releaseAt: range };
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

export function buildOrder(sortBy: string, sortOrder: string): Order {
	if (sortBy === "random") return [sequelize.literal("RANDOM()")];
	return [[sortBy, sortOrder.toUpperCase()]];
}
