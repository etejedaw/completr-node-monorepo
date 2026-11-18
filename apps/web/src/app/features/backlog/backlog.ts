import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type BulkResponse } from "../../core/models";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type BacklogBulkRequests,
	type BacklogBulkResults,
	type BacklogFilters,
	type BacklogListResponse,
	type BacklogSingleResponse,
	type BacklogUpdateResponse,
	type CreateBacklogDto,
	type PopularTagsResponse,
	type UpdateBacklogDto
} from "./backlog.model";

const POPULAR_TAGS_LIMIT = 20;

@Injectable({ providedIn: "root" })
export class BacklogService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/backlog`;

	getMyBacklog(filters: BacklogFilters = {}) {
		const params = buildHttpParams(filters);
		return this.http.get<BacklogListResponse>(this.baseUrl, { params });
	}

	getPopularTags(limit = POPULAR_TAGS_LIMIT) {
		return this.http
			.get<PopularTagsResponse>(`${environment.apiUrl}/tags/popular`, {
				params: { limit }
			})
			.pipe(map(res => res.data.tags));
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

	bulk<TAction extends keyof BacklogBulkRequests>(
		action: TAction,
		body: BacklogBulkRequests[TAction]
	) {
		return this.http
			.post<BulkResponse<BacklogBulkResults[TAction]>>(
				`${this.baseUrl}/bulk`,
				body,
				{ params: { action } }
			)
			.pipe(map(res => res.data));
	}
}
