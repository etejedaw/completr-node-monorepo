export const REWIND_OPENING_MONTH = 12;
export const REWIND_SPOTLIGHT_LAST_MONTH = 1;
export const REWIND_COVERS_LIMIT = 5;
export const REWIND_MIN_YEAR = 2000;
export const REWIND_MAX_YEAR = 2100;
export const REWIND_TOP_LIMIT = 3;
export const REWIND_MIN_STREAK_MONTHS = 2;
export const TROPHY_HUNTER_MIN_PLATINUMS = 3;
export const MARATHONER_MIN_FINISHED = 3;
export const MARATHONER_MIN_AVERAGE_HOURS = 30;
export const SHORT_AND_SWEET_MIN_FINISHED = 5;
export const SHORT_AND_SWEET_MAX_AVERAGE_HOURS = 8;
export const FINISHER_MIN_FINISHED = 10;
export const FINISHER_MIN_FINISH_RATE = 80;
export const GENRE_EXPLORER_MIN_GENRES = 6;
export const PICKY_PLAYER_MIN_ABANDONED = 3;
export const REWIND_REGENERATION_LIMIT = 1;
export const REWIND_GRACE_LAST_DAY = 7;
export const REWIND_AI_RECAP_PENDING_TIMEOUT_MS = 2 * 60 * 1000;
export const REWIND_MIN_RELEASE_YEAR = 1950;

export const REWIND_PERSONA_CODES = [
	"trophy-hunter",
	"marathoner",
	"short-and-sweet",
	"finisher",
	"genre-explorer",
	"picky-player",
	"steady-player"
] as const;

export type RewindPersonaCode = (typeof REWIND_PERSONA_CODES)[number];

export const REWIND_LANGUAGES = ["en", "es"] as const;

export type RewindLanguage = (typeof REWIND_LANGUAGES)[number];

export const REWIND_INSIGHT_KINDS = [
	"taste-vs-critics",
	"genre-pattern",
	"seasonal-rhythm",
	"finish-discipline",
	"long-vs-short",
	"platform-habit",
	"backlog-comeback"
] as const;

export type RewindInsightKind = (typeof REWIND_INSIGHT_KINDS)[number];

export const REWIND_AI_RECAP_STATES = [
	"ready",
	"failed",
	"available",
	"unavailable"
] as const;

export type RewindAiRecapState = (typeof REWIND_AI_RECAP_STATES)[number];

export const REWIND_LENGTH_RANGES = [
	"under-5",
	"5-15",
	"15-30",
	"over-30"
] as const;

export type RewindLengthRange = (typeof REWIND_LENGTH_RANGES)[number];

export const REWIND_LENGTH_RANGE_MAX_HOURS: Record<RewindLengthRange, number> =
	{
		"under-5": 5,
		"5-15": 15,
		"15-30": 30,
		"over-30": Number.POSITIVE_INFINITY
	};
