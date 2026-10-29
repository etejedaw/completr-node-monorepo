import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";
import { type HighlightsData, type ReviewEntry } from "./public-reviews.model";

@Injectable({ providedIn: "root" })
export class PublicReviewsService {
	private readonly http = inject(HttpClient);

	getUserReviews(
		username: string,
		opts: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(opts);
		return this.http
			.get<{
				data: { reviews: ReviewEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/reviews`, { params })
			.pipe(map(res => res.data));
	}

	getHighlights(
		username: string,
		opts: { year?: number; month?: number } = {}
	) {
		const params = buildHttpParams(opts);
		return this.http
			.get<{
				data: { highlights: HighlightsData };
			}>(`${environment.apiUrl}/users/${username}/highlights`, { params })
			.pipe(map(res => res.data.highlights));
	}
}
