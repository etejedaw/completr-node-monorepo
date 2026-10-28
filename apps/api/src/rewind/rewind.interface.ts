import { type UserRole } from "../users/user-role.type";

export interface RewindGameRef {
	gameId: string;
	code: string;
	title: string;
	coverUrl: string | null;
	backgroundUrl: string | null;
}

export interface RewindFinishedGame extends RewindGameRef {
	finishedAt: string;
	platformAbbreviation: string | null;
}

export interface RewindYearSummary {
	year: number;
	finishedCount: number;
	startedCount: number;
	hoursPlayed: number;
	covers: RewindGameRef[];
}

export interface RewindYears {
	spotlightYear: number | null;
	years: RewindYearSummary[];
}

export interface RewindTotals {
	finished: number;
	abandoned: number;
	started: number;
	hoursPlayed: number;
	platinums: number | null;
	finishRate: number | null;
	averageRating: number | null;
	genresPlayed: number;
	platformsPlayed: number;
}

export interface RewindRatedGame extends RewindFinishedGame {
	userRating: number;
}

export interface RewindRatioGame extends RewindFinishedGame {
	personalRatio: number;
}

export interface RewindDurationGame extends RewindFinishedGame {
	hours: number;
	isEstimate: boolean;
}

export interface RewindGenre {
	code: string;
	name: string;
	count: number;
}

export interface RewindPlatform {
	name: string;
	abbreviation: string;
	count: number;
}

export interface RewindMonth {
	month: number;
	count: number;
}

export interface RewindStreak {
	months: number;
	fromMonth: number;
	toMonth: number;
}

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

export interface RewindHighlights {
	topRated: RewindRatedGame | null;
	bestRatio: RewindRatioGame | null;
	longest: RewindDurationGame | null;
	fastest: RewindDurationGame | null;
	favoriteGenre: RewindGenre | null;
	topPlatform: RewindPlatform | null;
	busiestMonth: RewindMonth | null;
	firstFinished: RewindFinishedGame | null;
	lastFinished: RewindFinishedGame | null;
	topGenres: RewindGenre[];
	topPlatforms: RewindPlatform[];
	longestStreak: RewindStreak | null;
}

export interface RewindOwner {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
}

export interface Rewind {
	year: number;
	persona: RewindPersonaCode;
	user: RewindOwner;
	isSpotlight: boolean;
	otherYears: number[];
	totals: RewindTotals;
	finishedGames: RewindFinishedGame[];
	highlights: RewindHighlights;
}
