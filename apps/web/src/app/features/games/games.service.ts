import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Game, Genre, Platform } from "../../core/models";

interface GamesResponse {
	data: { games: Game[]; total: number; limit: number; offset: number };
}

interface GamesSearchResponse {
	data: { games: Game[] };
}

interface PlatformsResponse {
	data: { platforms: Platform[] };
}

interface GenresResponse {
	data: { genres: Genre[] };
}

export interface RawgDetail {
	rawgId: number;
	title: string;
	description: string | null;
	coverUrl: string | null;
	releaseAt: string | null;
	platforms: string[];
	genres: string[];
	scores: { source: string; score: number }[];
	times: { source: string; duration: number }[];
}

export interface CreateGameDto {
	title: string;
	description?: string;
	platforms?: string[];
	releaseAt?: string;
	coverUrl?: string;
	backgroundUrl?: string;
	isDlc?: boolean;
	parentGameId?: string;
	genres?: string[];
	scores?: { source: string; score: number }[];
	times?: { source: string; duration: number }[];
	externalIds?: { source: string; externalId: string }[];
}

export interface UpdateGameDto {
	title?: string;
	description?: string;
	platforms?: string[];
	releaseAt?: string;
	coverUrl?: string;
	backgroundUrl?: string;
	isDlc?: boolean;
	parentGameId?: string;
	genres?: string[];
	externalIds?: { source: string; externalId: string }[];
}

export interface GamesQuery {
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: string;
	genre?: string;
	no_scores?: boolean;
	no_times?: boolean;
	no_platforms?: boolean;
}

@Injectable({ providedIn: "root" })
export class GamesService {
	private readonly http = inject(HttpClient);

	getGames(query: GamesQuery = {}) {
		let params = new HttpParams();
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== null) {
				params = params.set(key, String(value));
			}
		}
		return this.http.get<GamesResponse>(`${environment.apiUrl}/games`, {
			params
		});
	}

	search(query: string, forceRawg = false) {
		const params = `query=${encodeURIComponent(query)}${forceRawg ? "&force_rawg=true" : ""}`;
		return this.http
			.get<GamesSearchResponse>(
				`${environment.apiUrl}/games/search?${params}`
			)
			.pipe(map(res => res.data.games));
	}

	searchLocal(query: string) {
		const params = `query=${encodeURIComponent(query)}&local_only=true`;
		return this.http
			.get<GamesSearchResponse>(
				`${environment.apiUrl}/games/search?${params}`
			)
			.pipe(map(res => res.data.games));
	}

	getLatestReviewed(limit = 16) {
		return this.http
			.get<GamesSearchResponse>(
				`${environment.apiUrl}/games/latest-reviewed?limit=${limit}`
			)
			.pipe(map(res => res.data.games));
	}

	getPlatforms() {
		return this.http
			.get<PlatformsResponse>(`${environment.apiUrl}/platforms`)
			.pipe(map(res => res.data.platforms));
	}

	getGenres() {
		return this.http
			.get<GenresResponse>(`${environment.apiUrl}/genres`)
			.pipe(map(res => res.data.genres));
	}

	getByCode(code: string) {
		return this.http
			.get<{
				data: { game: Game };
			}>(`${environment.apiUrl}/games/${code}`)
			.pipe(map(res => res.data.game));
	}

	createGame(dto: CreateGameDto) {
		return this.http
			.post<{ data: { game: Game } }>(`${environment.apiUrl}/games`, dto)
			.pipe(map(res => res.data.game));
	}

	deactivate(id: string) {
		return this.http.delete(`${environment.apiUrl}/games/${id}`);
	}

	hardDelete(id: string) {
		return this.http.delete(`${environment.apiUrl}/games/${id}?hard=true`);
	}

	updateGame(id: string, dto: UpdateGameDto) {
		return this.http
			.patch<{
				data: { game: Game };
			}>(`${environment.apiUrl}/games/${id}`, dto)
			.pipe(map(res => res.data.game));
	}

	rawgBySlug(slug: string) {
		return this.http
			.get<{
				data: { game: RawgDetail };
			}>(
				`${environment.apiUrl}/game-external/rawg/${encodeURIComponent(slug)}`
			)
			.pipe(map(res => res.data.game));
	}

	reportGame(gameId: string, message: string) {
		return this.http.post(`${environment.apiUrl}/games/${gameId}/reports`, {
			message
		});
	}

	createScore(gameId: string, source: string, score: number) {
		return this.http.post(`${environment.apiUrl}/game-scores`, {
			gameId,
			source,
			score
		});
	}

	updateScore(gameId: string, source: string, score: number) {
		return this.http.patch(
			`${environment.apiUrl}/game-scores/${gameId}/${source}`,
			{ score }
		);
	}

	createTime(gameId: string, source: string, duration: number) {
		return this.http.post(`${environment.apiUrl}/game-times`, {
			gameId,
			source,
			duration
		});
	}

	updateTime(gameId: string, source: string, duration: number) {
		return this.http.patch(
			`${environment.apiUrl}/game-times/${gameId}/${source}`,
			{ duration }
		);
	}

	deleteScore(gameId: string, source: string) {
		return this.http.delete(
			`${environment.apiUrl}/game-scores/${gameId}/${source}`,
			{ responseType: "text" }
		);
	}

	deleteTime(gameId: string, source: string) {
		return this.http.delete(
			`${environment.apiUrl}/game-times/${gameId}/${source}`,
			{ responseType: "text" }
		);
	}

	getGameLists(gameId: string) {
		return this.http
			.get<{
				data: {
					lists: {
						id: string;
						name: string;
						description?: string;
						isOfficial: boolean;
						completed: boolean;
						owner: { username: string } | null;
					}[];
				};
			}>(`${environment.apiUrl}/games/${gameId}/lists`)
			.pipe(map(res => res.data.lists));
	}
}
