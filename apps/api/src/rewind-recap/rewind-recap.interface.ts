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
