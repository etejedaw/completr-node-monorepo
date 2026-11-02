import { type Backlog } from "./backlog.model";

export interface CoopMemberSummary {
	userId: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	backlogId: string;
}

export interface CreatedBacklog {
	backlog: Backlog;
	reviewCreated: boolean;
	addedToQueue: boolean;
	addedToShelf: boolean;
}

export interface BacklogSummary {
	gameId: string;
	status: string;
	score: number | null;
	realDuration: number | null;
}

export interface BacklogHighlightGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null;
}

export interface BacklogHighlight {
	backlogId: string;
	game: BacklogHighlightGame;
	value: number;
}

export interface BacklogStats {
	totalEntries: number;
	countByStatus: {
		not_started: number;
		playing: number;
		completed: number;
		abandoned: number;
		endless: number;
	};
	totalRealHours: number | null;
	avgRealDuration: number | null;
	avgEstimatedDuration: number | null;
	avgScore: number | null;
	avgUserRating: number | null;
	avgRatio: number | null;
	avgPersonalRatio: number | null;
	estimatedVsRealDelta: number | null;
	completionRate: number | null;
	abandonmentRate: number | null;
	longestPlayed: BacklogHighlight | null;
	bestPersonalRatio: BacklogHighlight | null;
	highestRated: BacklogHighlight | null;
	ratingDistribution: RatingBucket[];
	completionsByMonth: MonthlyCount[];
}

export interface RatingBucket {
	stars: number;
	count: number;
}

export interface MonthlyCount {
	month: string;
	count: number;
}
