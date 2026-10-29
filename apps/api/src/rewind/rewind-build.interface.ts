import { type RewindPersonaCode } from "./rewind.constants";
import {
	type RewindDurationGame,
	type RewindFinishedGame,
	type RewindOwner,
	type RewindTotals
} from "./rewind.interface";
import { type RewindYearVisibility } from "./rewind-record.interface";
import { type RewindStoredView } from "./rewind-record.types";
import {
	type ClosedRewindRun,
	type RewindCalendar,
	type RewindGameGenre,
	type RewindRun,
	type RewindYearRuns,
	type RunHours
} from "./rewind-run.interface";

export interface FinishedBookends {
	firstFinished: RewindFinishedGame | null;
	lastFinished: RewindFinishedGame | null;
}

export interface RewindYearsSource {
	runs: RewindRun[];
	genres: RewindGameGenre[];
	platinumsByYear: ReadonlyMap<number, number | null>;
	calendar: RewindCalendar;
	visibility: RewindYearVisibility;
}

export interface RewindTotalsSource {
	yearRuns: RewindYearRuns;
	latestFinishedRuns: ClosedRewindRun[];
	genres: RewindGameGenre[];
	platinums: number | null;
}

export interface DurationCandidate extends RunHours {
	run: ClosedRewindRun;
}

export interface DurationExtremes {
	longest: RewindDurationGame | null;
	fastest: RewindDurationGame | null;
}

export interface RewindHighlightsSource {
	finishedRuns: ClosedRewindRun[];
	latestFinishedRuns: ClosedRewindRun[];
	finishedGames: RewindFinishedGame[];
	genres: RewindGameGenre[];
}

export interface RewindSource {
	year: number;
	owner: RewindOwner;
	runs: RewindRun[];
	genres: RewindGameGenre[];
	platinums: number | null;
	calendar: RewindCalendar;
	visibility: RewindYearVisibility;
	stored: RewindStoredView;
}

export interface GenreGames {
	name: string;
	gameIds: Set<string>;
}

export interface RatioCandidate {
	run: ClosedRewindRun;
	personalRatio: number;
}

export interface RewindPersonaStats {
	totals: RewindTotals;
	averageFinishedHours: number | null;
}

export interface PersonaRule {
	code: RewindPersonaCode;
	matches: (stats: RewindPersonaStats) => boolean;
}
