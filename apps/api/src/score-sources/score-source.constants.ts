export const SCORE_SOURCES = [
	"metacritic",
	"opencritic",
	"rawg",
	"completr"
] as const;

export type ScoreSourceCode = (typeof SCORE_SOURCES)[number];

export const SCORE_SOURCES_API = ["metacritic", "opencritic", "rawg"] as const;
