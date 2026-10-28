import { type UserRole } from "./user.model";

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

export interface RewindHighlights {
	topRated: RewindRatedGame | null;
	bestRatio: RewindRatioGame | null;
	longest: RewindDurationGame | null;
	fastest: RewindDurationGame | null;
	favoriteGenre: RewindGenre | null;
	topPlatform: RewindPlatform | null;
	busiestMonth: RewindMonth | null;
}

export interface RewindOwner {
	username: string;
	name: string;
	avatarUrl: string | null;
	role: UserRole;
}

export interface Rewind {
	year: number;
	user: RewindOwner;
	isSpotlight: boolean;
	otherYears: number[];
	totals: RewindTotals;
	finishedGames: RewindFinishedGame[];
	highlights: RewindHighlights;
}
