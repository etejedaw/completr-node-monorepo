import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";
import { GameSummary } from "./types";

export interface HighlightEntry {
	id: string;
	status: string;
	userRating?: number | null;
	realDuration?: number | null;
	finishedAt?: string | null;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
}

export interface ReviewEntry {
	id: string;
	content?: string;
	rating?: number;
	playthroughDuration?: number | null;
	game: { id: string; code: string; title: string } | null;
	createdAt: string;
}

export interface CompletionEntry {
	id: string;
	status: string;
	userRating?: number | null;
	realDuration?: number | null;
	finishedAt?: string | null;
	reviewContent: string | null;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
}

export interface HighlightsData {
	recent: HighlightEntry[];
	month: {
		startsAt: string;
		endsAt: string;
		completedCount: number;
		mostPlayed: HighlightEntry | null;
		highestRated: HighlightEntry | null;
	};
}

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

	getUserCompletions(
		username: string,
		opts: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(opts);
		return this.http
			.get<{
				data: { completions: CompletionEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/completions`, { params })
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
