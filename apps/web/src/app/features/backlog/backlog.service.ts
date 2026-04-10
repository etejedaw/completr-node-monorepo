import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { BacklogEntry } from "../../core/models";

interface BacklogResponse {
	data: { backlog: BacklogEntry[] };
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

@Injectable({ providedIn: "root" })
export class BacklogService {
	private readonly http = inject(HttpClient);

	getMyBacklog(filters: BacklogFilters = {}) {
		let params = new HttpParams();

		for (const [key, value] of Object.entries(filters)) {
			if (value !== undefined && value !== null && value !== "") {
				params = params.set(key, String(value));
			}
		}

		return this.http.get<BacklogResponse>(
			`${environment.apiUrl}/users/me/backlog`,
			{ params }
		);
	}
}
