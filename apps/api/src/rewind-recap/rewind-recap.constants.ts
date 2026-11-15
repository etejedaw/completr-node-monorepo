import { type RecapLengthBucket } from "./rewind-recap.interface";

export const MIN_GROUP_GAMES = 2;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const LENGTH_BUCKETS: RecapLengthBucket[] = [
	{ name: "under 5 hours", maxHours: 5 },
	{ name: "5 to 15 hours", maxHours: 15 },
	{ name: "15 to 30 hours", maxHours: 30 },
	{ name: "over 30 hours", maxHours: Number.POSITIVE_INFINITY }
];

export const QUARTER_NAMES = [
	"January to March",
	"April to June",
	"July to September",
	"October to December"
];

export const REWIND_RECAP_MAX_GAME_ROWS = 200;

export const REWIND_RECAP_GAME_COLUMNS = [
	"title",
	"status",
	"startedAt",
	"finishedAt",
	"platform",
	"genres",
	"franchise",
	"realHours",
	"estimatedHours",
	"lengthRange",
	"paceVsEstimate",
	"userRating",
	"criticScore",
	"ratingVsCritics",
	"daysInBacklog",
	"daysToFinish",
	"coopWith",
	"review"
] as const;

export const REWIND_RECAP_NOTES_COLUMN = "notes";

export const REWIND_RECAP_NOTE_MAX_LENGTH = 300;

export const REWIND_TASTE_VS_CRITICS_LIMIT = 8;

export const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
