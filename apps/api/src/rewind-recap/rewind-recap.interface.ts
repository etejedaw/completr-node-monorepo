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
	coopPartners: RewindCoopPartner[];
	reviews: RewindGameReview[];
	tags: RewindGameTag[];
	platinums: RewindRunPlatinum[] | null;
	upNext: RewindQueuedGame[];
	previousYearTotals: RewindTotals | null;
}

export interface RewindGameTag {
	gameId: string;
	tag: string;
}

export interface RewindRunPlatinum {
	runId: string;
	platinumedAt: string | null;
	notes: string | null;
}

export interface RewindQueuedGame {
	gameId: string;
	title: string;
	genres: string[];
	realDuration: number | null;
	duration: number | null;
	addedAt: string;
	queuedAt: string;
}

export interface RewindGameReview {
	gameId: string;
	content: string;
}

export interface RewindCoopPartner {
	runId: string;
	partnerId: string;
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

export interface RecapPlatinumGroup {
	name: string;
	games: number;
	platinumed: number;
}

export interface RecapPlatinumStats {
	platinumed: number;
	sameDay: number;
	afterFinishing: number;
	beforeFinishing: number;
	undated: number;
	medianDaysAfterFinishing: number | null;
	byGenre: RecapPlatinumGroup[];
	byLength: RecapPlatinumGroup[];
}

export interface RecapUpNextGame {
	title: string;
	genres: string | null;
	lengthRange: string | null;
	estimatedHours: number | null;
	daysWaiting: number;
	daysQueued: number;
	tags: string | null;
}

export interface RewindRecapPatterns {
	byGenre: RecapGroupStats[];
	byPlatform: RecapGroupStats[];
	byLength: RecapGroupStats[];
	byQuarter: RecapGroupStats[];
	bySocial: RecapGroupStats[];
	byPartner: RecapGroupStats[];
	byTag: RecapGroupStats[];
	sameDayCloses: RecapSameDayClose[];
	quickDrops: RecapTimedGame[];
	slowestFinishes: RecapTimedGame[];
	startedInEarlierYears: RecapTimedGame[];
	pace: RecapPaceStats;
	franchises: RecapFranchiseGroup[];
	overlap: RecapOverlapStats;
	ratingHabits: RecapRatingHabits;
	platinums: RecapPlatinumStats | null;
	importedCloses: number;
}

export interface GameRowLookups {
	genreNamesByGame: Map<string, string[]>;
	franchiseNamesByGame: Map<string, string[]>;
	coopAliasesByRun: Map<string, string[]>;
	reviewsByGame: Map<string, string>;
	tagsByGame: Map<string, string[]>;
	platinumsByRun: Map<string, RewindRunPlatinum> | null;
}

export interface RecapLengthBucket {
	name: string;
	maxHours: number;
}
