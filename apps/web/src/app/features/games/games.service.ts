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

export interface GamesQuery {
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: string;
	genre?: string;
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

	deactivate(id: string) {
		return this.http.delete(`${environment.apiUrl}/games/${id}`);
	}
}
