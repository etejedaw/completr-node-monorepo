import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { BacklogEntry } from "../../core/models";

interface BacklogListResponse {
	data: { backlog: BacklogEntry[] };
}

interface BacklogSingleResponse {
	data: { backlog: BacklogEntry };
}

export interface BacklogFilters {
	status?: string;
	platform_id?: string;
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
	min_rating?: number;
	max_rating?: number;
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
}

export interface UpdateBacklogDto {
	status?: string;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	score?: number;
	duration?: number;
	userRating?: number;
	isPublic?: boolean;
	notes?: string;
}

@Injectable({ providedIn: "root" })
export class BacklogService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/backlog`;

	getMyBacklog(filters: BacklogFilters = {}) {
		let params = new HttpParams();

		for (const [key, value] of Object.entries(filters)) {
			if (value !== undefined && value !== null && value !== "") {
				params = params.set(key, String(value));
			}
		}

		return this.http.get<BacklogListResponse>(this.baseUrl, { params });
	}

	create(dto: CreateBacklogDto) {
		return this.http
			.post<BacklogSingleResponse>(this.baseUrl, dto)
			.pipe(map(res => res.data.backlog));
	}

	update(id: string, dto: UpdateBacklogDto) {
		return this.http
			.patch<BacklogSingleResponse>(`${this.baseUrl}/${id}`, dto)
			.pipe(map(res => res.data.backlog));
	}

	delete(id: string) {
		return this.http.delete(`${this.baseUrl}/${id}`);
	}
}
