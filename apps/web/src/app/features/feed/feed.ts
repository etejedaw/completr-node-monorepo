import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

import { environment } from "../../../environments/environment";
import { buildHttpParams } from "../../core/utils/http-params";
import { type FeedActivity, type FeedPagination } from "./feed.model";

@Injectable({ providedIn: "root" })
export class FeedService {
	private readonly http = inject(HttpClient);

	getFeed(pagination: FeedPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<{
			data: { activities: FeedActivity[]; total: number };
		}>(`${environment.apiUrl}/feed`, { params });
	}

	deleteActivity(id: string) {
		return this.http.delete(`${environment.apiUrl}/feed/${id}`);
	}
}
