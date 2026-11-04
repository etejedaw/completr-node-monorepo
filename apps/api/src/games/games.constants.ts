export const EXTERNAL_DATA_SOURCES = ["metacritic", "hltb", "igdb"] as const;

export type ExternalDataSource = (typeof EXTERNAL_DATA_SOURCES)[number];

export const REQUIRED_EXTERNAL_DATA_SOURCES = [
	"metacritic",
	"hltb"
] as const satisfies readonly ExternalDataSource[];

export const EXTERNAL_DATA_THROTTLE_SUFFIXES = [
	"_RATE_LIMITED",
	"_BLOCKED"
] as const;

export const EXTERNAL_DATA_REFRESH_DEADLINE_MS = 45_000;

export const HLTB_ID_LOOKUP_PAUSED = "HLTB_ID_LOOKUP_PAUSED";

export const EXTERNAL_DATA_DEADLINE_EXCEEDED =
	"EXTERNAL_DATA_DEADLINE_EXCEEDED";

export const EXTERNAL_DATA_SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE";

const DAY_MS = 24 * 60 * 60 * 1000;

export const EXTERNAL_DATA_RETRY_COOLDOWN_MS = {
	not_found: 30 * DAY_MS,
	ambiguous: 30 * DAY_MS,
	no_data: 7 * DAY_MS,
	failed: 7 * DAY_MS
} as const;

export const IGDB_AUTH_ERROR = "IGDB_AUTH_ERROR";

export const IGDB_DISABLED = "IGDB_DISABLED";

export const IGDB_MIN_REQUEST_INTERVAL_MS = 275;

export const IGDB_SEARCH_LIMIT = 10;

export const EXTERNAL_DATA_UNRECORDED_FAILURE_CODES = [
	IGDB_AUTH_ERROR,
	IGDB_DISABLED,
	HLTB_ID_LOOKUP_PAUSED,
	EXTERNAL_DATA_DEADLINE_EXCEEDED,
	EXTERNAL_DATA_SOURCE_UNAVAILABLE
] as const;

export const EXTERNAL_DATA_UNRECORDED_FAILURE_SUFFIXES = [
	...EXTERNAL_DATA_THROTTLE_SUFFIXES,
	"_PARSE_ERROR"
] as const;

export const EXTERNAL_DATA_UNRECORDED_FAILURE_PREFIX = "WIKIDATA_";
