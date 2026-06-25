import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { BacklogEntry } from "../../core/models";
import { Appendable, buildHttpParams } from "../../core/utils/http-params";

interface BacklogListResponse {
	data: { backlog: BacklogEntry[]; total: number };
}

interface BacklogSingleResponse {
	data: { backlog: BacklogEntry };
}

interface BacklogUpdateResponse {
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

@Injectable({ providedIn: "root" })
export class BacklogService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/backlog`;

	getMyBacklog(filters: BacklogFilters = {}) {
		const params = buildHttpParams(filters);
		return this.http.get<BacklogListResponse>(this.baseUrl, { params });
	}

	create(dto: CreateBacklogDto) {
		return this.http
			.post<BacklogSingleResponse>(this.baseUrl, dto)
			.pipe(map(res => res.data.backlog));
	}

	update(id: string, dto: UpdateBacklogDto) {
		return this.http
			.patch<BacklogUpdateResponse>(`${this.baseUrl}/${id}`, dto)
			.pipe(map(res => res.data));
	}

	delete(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}`);
	}
}
