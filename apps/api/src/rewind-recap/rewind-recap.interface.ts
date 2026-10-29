import { type RewindLanguage } from "../rewind/rewind.constants";
import { type Rewind, type RewindTotals } from "../rewind/rewind.interface";
import {
	type RewindGameGenre,
	type RewindRun
} from "../rewind/rewind-run.interface";

export interface RewindRecapInput {
	year: number;
	language: RewindLanguage;
	rewind: Rewind;
	runs: RewindRun[];
	genres: RewindGameGenre[];
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

export interface RewindRecapPatterns {
	byGenre: RecapGroupStats[];
	byPlatform: RecapGroupStats[];
	byLength: RecapGroupStats[];
	byQuarter: RecapGroupStats[];
	sameDayCloses: RecapSameDayClose[];
	quickDrops: RecapTimedGame[];
	slowestFinishes: RecapTimedGame[];
	startedInEarlierYears: RecapTimedGame[];
	importedCloses: number;
}

export interface RecapLengthBucket {
	name: string;
	maxHours: number;
}
