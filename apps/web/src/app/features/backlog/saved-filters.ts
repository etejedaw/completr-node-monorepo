import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type CreateSavedFilterDto,
	type SavedFilterResponse,
	type SavedFiltersPagination,
	type SavedFiltersResponse,
	type SavedFilterStatsResponse,
	type StatGroup
} from "./saved-filters.model";

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
	"countByStatus",
	"ratingDistribution",
	"completionsByMonth"
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const DEFAULT_ENABLED_STATS: StatKey[] = [
	"totalEntries",
	"totalRealHours",
	"avgRatio",
	"avgPersonalRatio",
	"completionsByMonth",
	"countByStatus"
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
	longestPlayed: "Longest played",
	bestPersonalRatio: "Best personal ratio",
	highestRated: "Highest rated",
	countByStatus: "Games by status",
	ratingDistribution: "Your ratings",
	completionsByMonth: "Completions by month"
};

export const SUMMARY_STAT_KEYS: readonly StatKey[] = [
	"totalEntries",
	"totalRealHours",
	"avgRatio",
	"avgPersonalRatio"
];

export const STAT_GROUPS: readonly StatGroup[] = [
	{
		label: "Summary",
		hint: "Always visible above your games.",
		keys: SUMMARY_STAT_KEYS
	},
	{
		label: "Charts",
		hint: "Shown when you expand the stats.",
		keys: ["completionsByMonth", "countByStatus", "ratingDistribution"]
	},
	{
		label: "Rates & averages",
		hint: null,
		keys: [
			"completionRate",
			"abandonmentRate",
			"avgEstimatedDuration",
			"avgRealDuration",
			"estimatedVsRealDelta",
			"avgScore",
			"avgUserRating"
		]
	},
	{
		label: "Highlights",
		hint: null,
		keys: ["longestPlayed", "bestPersonalRatio", "highestRated"]
	}
];

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

	reorder(ids: string[]) {
		return this.http
			.put<SavedFiltersResponse>(`${this.baseUrl}/reorder`, { ids })
			.pipe(map(res => res.data.savedFilters));
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
