import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from "../igdb.constants";

export function normalizeSearchLimit(limit: number | undefined): number {
	if (limit === undefined || !Number.isInteger(limit) || limit <= 0)
		return DEFAULT_SEARCH_LIMIT;
	return Math.min(limit, MAX_SEARCH_LIMIT);
}
