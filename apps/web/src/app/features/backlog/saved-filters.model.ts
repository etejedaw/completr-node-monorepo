import { type Appendable } from "../../core/utils/http-params";
import { type StatKey } from "./saved-filters";

export interface StatGroup {
	label: string;
	hint: string | null;
	keys: readonly StatKey[];
}

export interface SavedFilter {
	id: string;
	name: string;
	description?: string;
	filters: Record<string, unknown>;
	sortBy?: string;
	sortOrder?: string;
	showInBacklog: boolean;
	isDefault: boolean;
	enabledStats: string[] | null;
	icon: string | null;
	color: string | null;
	createdAt: string;
}

export interface SavedFiltersResponse {
	data: { savedFilters: SavedFilter[]; total?: number; frozen?: boolean };
}

export interface SavedFiltersPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

export interface SavedFilterResponse {
	data: { savedFilter: SavedFilter };
}

export interface CreateSavedFilterDto {
	name: string;
	description?: string;
	filters: Record<string, unknown>;
	sortBy?: string;
	sortOrder?: string;
	showInBacklog?: boolean;
	isDefault?: boolean;
	enabledStats?: string[] | null;
	icon?: string | null;
	color?: string | null;
}

export interface BacklogHighlight {
	backlogId: string;
	game: {
		id: string;
		code: string;
		title: string;
		backgroundUrl: string | null;
	};
	value: number;
}

export interface RatingBucket {
	stars: number;
	count: number;
}

export interface MonthlyCount {
	month: string;
	count: number;
}

export interface SavedFilterStats {
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
	ratingDistribution?: RatingBucket[];
	completionsByMonth?: MonthlyCount[];
}

export interface SavedFilterStatsResponse {
	data: { stats: SavedFilterStats };
}
