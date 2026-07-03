import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Appendable, buildHttpParams } from "../../core/utils/http-params";

export const STAT_KEYS = [
	"totalEntries",
	"totalRealHours",
	"avgRatio",
	"avgPersonalRatio",
	"completionRate",
	"abandonmentRate",
	"avgRealDuration",
	"avgEstimatedDuration",
	"avgScore",
	"avgUserRating",
	"estimatedVsRealDelta",
	"longestPlayed",
	"bestPersonalRatio",
	"highestRated",
	"countByStatus"
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const DEFAULT_ENABLED_STATS: StatKey[] = [
	"totalEntries",
	"totalRealHours",
	"avgRatio",
	"avgPersonalRatio"
];

export const STAT_LABELS: Record<StatKey, string> = {
	totalEntries: "Entries",
	totalRealHours: "Real hours",
	avgRatio: "Avg ratio",
	avgPersonalRatio: "Avg personal ratio",
	completionRate: "Completion rate",
	abandonmentRate: "Abandonment rate",
	avgRealDuration: "Avg real duration",
	avgEstimatedDuration: "Avg estimated duration",
	avgScore: "Avg score",
	avgUserRating: "Avg rating",
	estimatedVsRealDelta: "Estimated vs real Δ",
	longestPlayed: "Longest played (highlight)",
	bestPersonalRatio: "Best personal ratio (highlight)",
	highestRated: "Highest rated (highlight)",
	countByStatus: "By status (chips)"
};

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
	createdAt: string;
}

interface SavedFiltersResponse {
	data: { savedFilters: SavedFilter[]; total?: number };
}

export interface SavedFiltersPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

interface SavedFilterResponse {
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
}

interface SavedFilterStatsResponse {
	data: { stats: SavedFilterStats };
}

@Injectable({ providedIn: "root" })
export class SavedFiltersService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/saved-filters`;

	getAll() {
		return this.http
			.get<SavedFiltersResponse>(this.baseUrl)
			.pipe(map(res => res.data.savedFilters));
	}

	getPaged(pagination: SavedFiltersPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<SavedFiltersResponse>(this.baseUrl, { params });
	}

	create(dto: CreateSavedFilterDto) {
		return this.http
			.post<SavedFilterResponse>(this.baseUrl, dto)
			.pipe(map(res => res.data.savedFilter));
	}

	update(id: string, dto: Partial<CreateSavedFilterDto>) {
		return this.http
			.patch<SavedFilterResponse>(`${this.baseUrl}/${id}`, dto)
			.pipe(map(res => res.data.savedFilter));
	}

	delete(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}`);
	}

	getStats(id: string) {
		return this.http
			.get<SavedFilterStatsResponse>(`${this.baseUrl}/${id}/stats`)
			.pipe(map(res => res.data.stats));
	}
}
