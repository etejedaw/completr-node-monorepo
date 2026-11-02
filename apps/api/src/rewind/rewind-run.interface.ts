import { type BacklogStatus } from "../backlog/backlog.model";
import { type RewindGameRef } from "./rewind.interface";

export interface RewindRunPlatform {
	name: string;
	abbreviation: string;
}

export interface RewindRun {
	id: string;
	gameId: string;
	status: BacklogStatus;
	startedAt: string | null;
	finishedAt: string | null;
	realDuration: number | null;
	duration: number | null;
	score: number | null;
	userRating: number | null;
	createdAt: string;
	notes: string | null;
	releaseYear: number | null;
	game: RewindGameRef;
	platform: RewindRunPlatform | null;
}

export interface ClosedRewindRun extends RewindRun {
	finishedAt: string;
}

export interface RewindCalendar {
	today: Date;
	firstYear: number;
}

export interface RewindGameGenre {
	gameId: string;
	code: string;
	name: string;
}

export interface RewindGameFranchise {
	gameId: string;
	name: string;
}

export interface RewindYearRuns {
	finished: ClosedRewindRun[];
	abandoned: ClosedRewindRun[];
	started: RewindRun[];
}

export interface RunHours {
	hours: number;
	isEstimate: boolean;
}
