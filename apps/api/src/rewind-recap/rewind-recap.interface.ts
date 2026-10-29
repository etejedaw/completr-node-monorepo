import { type RewindLanguage } from "../rewind/rewind.constants";
import { type Rewind, type RewindTotals } from "../rewind/rewind.interface";
import {
	type RewindGameFranchise,
	type RewindGameGenre,
	type RewindRun
} from "../rewind/rewind-run.interface";

export interface RewindRecapInput {
	year: number;
	language: RewindLanguage;
	includesNotes: boolean;
	rewind: Rewind;
	runs: RewindRun[];
	genres: RewindGameGenre[];
	franchises: RewindGameFranchise[];
	previousYearTotals: RewindTotals | null;
}

export interface RewindPremiumStatsInput {
	year: number;
	runs: RewindRun[];
	genres: RewindGameGenre[];
	addedByMonth: number[];
}

export interface RecapGroupStats {
	name: string;
	games: number;
	finished: number;
	abandoned: number;
	averageRating: number | null;
	averageRatingVsCritics: number | null;
	averageHours: number | null;
	finishedTitles: string[];
	abandonedTitles: string[];
}

export interface RecapClosedGame {
	title: string;
	status: string;
	userRating: number | null;
}

export interface RecapSameDayClose {
	date: string;
	games: RecapClosedGame[];
}

export interface RecapTimedGame {
	title: string;
	status: string;
	startedAt: string;
	finishedAt: string;
	days: number;
}

export interface RecapPaceStats {
	games: number;
	medianPace: number | null;
	slowerThanEstimate: number;
	fasterThanEstimate: number;
}

export interface RecapFranchiseGame {
	title: string;
	status: string;
	finishedAt: string;
}

export interface RecapFranchiseGroup {
	name: string;
	games: RecapFranchiseGame[];
}

export interface RecapOverlapStats {
	games: number;
	overlapping: number;
	solo: number;
}

export interface RecapRatingHabits {
	rated: number;
	mostUsedRating: number | null;
	fives: number;
}

export interface RecapDayInterval {
	runId: string;
	start: number;
	end: number;
}

export interface RewindRecapPatterns {
	byGenre: RecapGroupStats[];
	byPlatform: RecapGroupStats[];
	byLength: RecapGroupStats[];
	byQuarter: RecapGroupStats[];
	sameDayCloses: RecapSameDayClose[];
	quickDrops: RecapTimedGame[];
	slowestFinishes: RecapTimedGame[];
	startedInEarlierYears: RecapTimedGame[];
	pace: RecapPaceStats;
	franchises: RecapFranchiseGroup[];
	overlap: RecapOverlapStats;
	ratingHabits: RecapRatingHabits;
	importedCloses: number;
}

export interface GameRowLookups {
	genreNamesByGame: Map<string, string[]>;
	franchiseNamesByGame: Map<string, string[]>;
}

export interface RecapLengthBucket {
	name: string;
	maxHours: number;
}
