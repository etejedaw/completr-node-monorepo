export const EXTERNAL_DATA_SOURCES = ["metacritic", "hltb"] as const;

export type ExternalDataSource = (typeof EXTERNAL_DATA_SOURCES)[number];

export const EXTERNAL_DATA_THROTTLE_SUFFIXES = [
	"_RATE_LIMITED",
	"_BLOCKED"
] as const;

export const EXTERNAL_DATA_REFRESH_DEADLINE_MS = 45_000;

export const EXTERNAL_DATA_DEADLINE_EXCEEDED =
	"EXTERNAL_DATA_DEADLINE_EXCEEDED";
