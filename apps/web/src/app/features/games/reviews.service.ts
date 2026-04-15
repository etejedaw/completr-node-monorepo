import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";

export interface Review {
	id: string;
	content?: string;
	rating?: number;
	user: {
		id: string;
		username: string;
		name: string;
		avatarUrl?: string;
	} | null;
	createdAt: string;
	updatedAt: string;
}

@Injectable({ providedIn: "root" })
export class ReviewsService {
	private readonly http = inject(HttpClient);

	getReviews(gameId: string) {
		return this.http
			.get<{
				data: { reviews: Review[] };
			}>(`${environment.apiUrl}/games/${gameId}/reviews`)
			.pipe(map(res => res.data.reviews));
	}

	createReview(gameId: string, data: { content?: string; rating?: number }) {
		return this.http
			.post<{
				data: { review: Review };
			}>(`${environment.apiUrl}/games/${gameId}/reviews`, data)
			.pipe(map(res => res.data.review));
	}

	updateReview(
		gameId: string,
		data: { content?: string | null; rating?: number | null }
	) {
		return this.http
			.patch<{
				data: { review: Review };
			}>(`${environment.apiUrl}/games/${gameId}/reviews`, data)
			.pipe(map(res => res.data.review));
	}

	deleteReview(gameId: string) {
		return this.http.delete(
			`${environment.apiUrl}/games/${gameId}/reviews`
		);
	}
}
