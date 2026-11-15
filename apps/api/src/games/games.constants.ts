import { type OnlineSearchCooldown } from "./games.interface";
import { type OnlineSearchOutcome } from "./games.types";
import { type ExternalDataRefreshTimer } from "./games-external-data.interface";

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

export const GAME_REFERENCE_ATTRS = ["id", "title", "code"];

export const LOCAL_SEARCH_LIMIT = 10;

export const DEFAULT_GAMES_PAGE_SIZE = 50;

export const DEFAULT_LATEST_REVIEWED_LIMIT = 16;

export const RAWG_UNAVAILABLE_COOLDOWN_MS = 2 * 60 * 1000;

export const RAWG_SEARCH_PAGE_SIZE = 3;

export const IGDB_IMPORT_LIMIT = 3;

const IGDB_MAIN_GAME_TYPE = 0;
const IGDB_STANDALONE_EXPANSION_TYPE = 4;
const IGDB_REMAKE_TYPE = 8;
const IGDB_REMASTER_TYPE = 9;
const IGDB_EXPANDED_GAME_TYPE = 10;
const IGDB_PORT_TYPE = 11;

export const SEARCHABLE_IGDB_GAME_TYPES: ReadonlySet<number> = new Set([
	IGDB_MAIN_GAME_TYPE,
	IGDB_STANDALONE_EXPANSION_TYPE,
	IGDB_REMAKE_TYPE,
	IGDB_REMASTER_TYPE,
	IGDB_EXPANDED_GAME_TYPE,
	IGDB_PORT_TYPE
]);

export const IMPORT_ENRICHMENT_QUEUE_CAPACITY = 50;

export const IMPORT_ENRICHMENT_PAUSE_MS = 10 * 60 * 1000;

export const IMPORT_ENRICHMENT_OPERATION = "importEnrichment";

export const CANONICAL_SCORE_SUBQUERY = `(
	SELECT gs.score * 5.0 / ss.scale FROM "GameScores" gs
	JOIN "ScoreSources" ss ON ss.code = gs."source"
	WHERE gs."gameId" = "Game"."id"
	ORDER BY ss.priority ASC, ss.code ASC
	LIMIT 1
)`;

const DURATION_SOURCE_PRIORITY = ["completr", "hltb", "rawg"] as const;
const UNLISTED_DURATION_SOURCE_RANK = 99;

const DURATION_SOURCE_RANK_CASES = DURATION_SOURCE_PRIORITY.map(
	(source, index) => `WHEN '${source}' THEN ${index + 1}`
).join(" ");

export const CANONICAL_DURATION_SUBQUERY = `(
	SELECT duration FROM "GameTimes" gt
	WHERE gt."gameId" = "Game"."id"
	ORDER BY CASE gt."source"
		${DURATION_SOURCE_RANK_CASES}
		ELSE ${UNLISTED_DURATION_SOURCE_RANK}
	END
	LIMIT 1
)`;

export const POPULARITY_SUBQUERY = `(
	SELECT score FROM "GamePopularities" gp
	WHERE gp."gameId" = "Game"."id"
)`;

export const ONLINE_SEARCH_UNAVAILABLE: OnlineSearchOutcome = {
	available: false
};

export const NO_COOLDOWN: OnlineSearchCooldown = {
	durationMs: 0,
	now: () => Date.now()
};

export const DEFAULT_EXTERNAL_DATA_REFRESH_TIMER: ExternalDataRefreshTimer = {
	deadlineMs: EXTERNAL_DATA_REFRESH_DEADLINE_MS,
	startTimer(milliseconds, onExpire) {
		const timer = setTimeout(onExpire, milliseconds);
		return () => clearTimeout(timer);
	}
};
