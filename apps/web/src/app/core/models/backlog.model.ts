export interface BacklogEntry {
	id: string;
	status: BacklogStatus;
	score?: number;
	duration?: number;
	ratio?: number;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	userRating?: number;
	isPublic: boolean;
	notes?: string;
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
	title: string;
	coverUrl?: string;
	isDlc: boolean;
}

interface BacklogPlatform {
	id: string;
	abbreviation: string;
}
