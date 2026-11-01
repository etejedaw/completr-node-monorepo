export const EXTERNAL_DATA_SOURCES = ["metacritic", "hltb"] as const;

export type ExternalDataSource = (typeof EXTERNAL_DATA_SOURCES)[number];

export const EXTERNAL_DATA_THROTTLE_SUFFIXES = [
	"_RATE_LIMITED",
	"_BLOCKED"
] as const;
