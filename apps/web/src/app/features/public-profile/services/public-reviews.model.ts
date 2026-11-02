import { type GameSummary } from "./types.model";

export interface HighlightEntry {
	id: string;
	status: string;
	userRating?: number | null;
	realDuration?: number | null;
	personalRatio?: number | null;
	finishedAt?: string | null;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
}

export interface ReviewEntry {
	id: string;
	content?: string;
	rating?: number;
	playthroughDuration?: number | null;
	game: {
		id: string;
		code: string;
		title: string;
		coverUrl?: string | null;
		backgroundUrl?: string | null;
	} | null;
	createdAt: string;
}

export interface HighlightsData {
	recent: HighlightEntry[];
	month: {
		startsAt: string;
		endsAt: string;
		completedCount: number;
		longestPlayed: HighlightEntry | null;
		bestPersonalRatio: HighlightEntry | null;
		highestRated: HighlightEntry | null;
	};
}
