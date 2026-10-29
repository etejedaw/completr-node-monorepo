import { type BacklogEntry } from "../../core/models";
import { type Appendable } from "../../core/utils/http-params";

export interface BacklogListResponse {
	data: { backlog: BacklogEntry[]; total: number };
}

export interface BacklogSingleResponse {
	data: { backlog: BacklogEntry };
}

export interface BacklogUpdateResponse {
	data: { backlog: BacklogEntry; queueRemoved: boolean };
}

export interface BacklogFilters extends Record<string, Appendable> {
	status?: string;
	game_id?: string;
	platform_id?: string;
	platforms?: string;
	genres?: string;
	release_year_from?: number;
	release_year_to?: number;
	sort_by?: string;
	sort_order?: string;
	started_from?: string;
	started_to?: string;
	finished_from?: string;
	finished_to?: string;
	active_from?: string;
	active_to?: string;
	undated?: boolean;
	coop_only?: boolean;
	platinumed_only?: boolean;
	min_score?: number;
	max_score?: number;
	min_duration?: number;
	max_duration?: number;
	min_real_duration?: number;
	max_real_duration?: number;
	min_rating?: number;
	max_rating?: number;
	min_ratio?: number;
	max_ratio?: number;
	min_personal_ratio?: number;
	max_personal_ratio?: number;
	mood_tags?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface BacklogReviewDraft {
	content?: string;
	rating?: number;
}

export interface CreateBacklogDto {
	gameId: string;
	platformId: string;
	score: number;
	duration: number;
	status?: string;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	userRating?: number;
	isPublic?: boolean;
	notes?: string;
	compilationGameId?: string;
	addToQueue?: boolean;
	addToShelf?: boolean;
	moodTags?: string[];
	review?: BacklogReviewDraft;
	progressNote?: string;
}

export interface UpdateBacklogDto {
	status?: string;
	startedAt?: string | null;
	finishedAt?: string | null;
	realDuration?: number | null;
	score?: number;
	duration?: number;
	userRating?: number | null;
	isPublic?: boolean;
	notes?: string | null;
	compilationGameId?: string | null;
}
