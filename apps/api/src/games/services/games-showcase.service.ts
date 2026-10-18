import { QueryTypes } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type ShowcaseGameRow } from "../games.interface";
import {
	CANONICAL_DURATION_SUBQUERY,
	CANONICAL_SCORE_SUBQUERY
} from "../utils/search-filters.util";

const SHOWCASE_SIZE = 21;
const SHOWCASE_CACHE_TTL_MS = 30 * 60 * 1000;

interface CachedShowcase {
	games: ShowcaseGameRow[];
	fetchedAt: number;
}

let cachedShowcase: CachedShowcase | null = null;
let inflightShowcase: Promise<ShowcaseGameRow[]> | null = null;

async function queryShowcaseGames(): Promise<ShowcaseGameRow[]> {
	return await sequelize.query<ShowcaseGameRow>(
		`
		SELECT "Game"."id",
			"Game"."code",
			"Game"."title",
			"Game"."backgroundUrl",
			${CANONICAL_SCORE_SUBQUERY}::float8 AS "score",
			${CANONICAL_DURATION_SUBQUERY}::float8 AS "duration"
		FROM "Games" AS "Game"
		LEFT JOIN "GamePopularities" gp ON gp."gameId" = "Game"."id"
		WHERE "Game"."isActive" = true
			AND "Game"."isDlc" = false
			AND "Game"."backgroundUrl" IS NOT NULL
		ORDER BY COALESCE(gp."score", 0) DESC, "Game"."title" ASC, "Game"."id" ASC
		LIMIT :limit
		`,
		{ type: QueryTypes.SELECT, replacements: { limit: SHOWCASE_SIZE } }
	);
}

function isFresh(cache: CachedShowcase | null): cache is CachedShowcase {
	return !!cache && Date.now() - cache.fetchedAt < SHOWCASE_CACHE_TTL_MS;
}

export async function findShowcaseGames(): Promise<ShowcaseGameRow[]> {
	if (isFresh(cachedShowcase)) return cachedShowcase.games;

	try {
		inflightShowcase ??= queryShowcaseGames().finally(() => {
			inflightShowcase = null;
		});
		const games = await inflightShowcase;
		if (games.length > 0) cachedShowcase = { games, fetchedAt: Date.now() };
		return games;
	} catch (error) {
		if (cachedShowcase) return cachedShowcase.games;
		throw error;
	}
}
