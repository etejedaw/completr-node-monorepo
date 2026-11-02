import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type BacklogFilters,
	type BacklogListResponse,
	type BacklogSingleResponse,
	type BacklogUpdateResponse,
	type CreateBacklogDto,
	type UpdateBacklogDto
} from "./backlog.model";

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
