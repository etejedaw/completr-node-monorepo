export interface BacklogEntry {
	id: string;
	status: BacklogStatus;
	score?: number;
	duration?: number;
	ratio?: number;
	personalRatio?: number;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	userRating?: number;
	isPublic: boolean;
	notes?: string;
	hasReview?: boolean;
	reviewContent?: string | null;
	review?: { content: string | null; rating: number | null } | null;
	game: BacklogGame;
	platform: BacklogPlatform;
}

export type BacklogStatus =
	| "not_started"
	| "playing"
	| "completed"
	| "abandoned";

interface BacklogGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
	isDlc: boolean;
}

interface BacklogPlatform {
	id: string;
	abbreviation: string;
}
