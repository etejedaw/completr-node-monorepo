import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Game, Genre, Platform } from "../../core/models";
import { Appendable, buildHttpParams } from "../../core/utils/http-params";

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
	variant?: string;
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
	variant?: string | null;
	genres?: string[];
	externalIds?: { source: string; externalId: string }[];
}

export interface SplitGameDto {
	variants: { title: string; variant: string }[];
}

export type CompilationItemInput =
	| { mode: "link"; gameId: string }
	| { mode: "create"; title: string };

export interface SetCompilationItemsDto {
	items: CompilationItemInput[];
}

export interface CompilationItemResponse {
	id: string;
	position: number;
	childGameId: string;
	childGame: Game | null;
}

export interface GamesQuery extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	sort_by?: string;
	sort_order?: string;
	search?: string;
	genre?: string;
	genres?: string;
	platforms?: string;
	release_year_from?: number;
	release_year_to?: number;
	min_score?: number;
	max_score?: number;
	min_duration?: number;
	max_duration?: number;
	is_dlc?: boolean;
	no_scores?: boolean;
	no_times?: boolean;
	no_platforms?: boolean;
	no_score_source?: string;
	no_time_source?: string;
	include_inactive?: boolean;
	only_inactive?: boolean;
}

@Injectable({ providedIn: "root" })
export class GamesService {
	private readonly http = inject(HttpClient);

	getGames(query: GamesQuery = {}) {
		const params = buildHttpParams(query);
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

	getGenreGames(
		code: string,
		opts: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(opts);
		return this.http
			.get<{
				data: { genre: Genre; games: Game[]; hasMore: boolean };
			}>(`${environment.apiUrl}/genres/${code}/games`, { params })
			.pipe(map(res => res.data));
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

	reactivate(id: string) {
		return this.http.post(
			`${environment.apiUrl}/games/${id}/reactivate`,
			{}
		);
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

	splitGame(id: string, dto: SplitGameDto) {
		return this.http
			.post<{
				data: { games: Game[] };
			}>(`${environment.apiUrl}/games/${id}/split`, dto)
			.pipe(map(res => res.data.games));
	}

	setCompilationItems(id: string, dto: SetCompilationItemsDto) {
		return this.http
			.put<{
				data: { items: CompilationItemResponse[] };
			}>(`${environment.apiUrl}/games/${id}/compilation-items`, dto)
			.pipe(map(res => res.data.items));
	}

	clearCompilation(id: string) {
		return this.http.delete(
			`${environment.apiUrl}/games/${id}/compilation-items`,
			{ responseType: "text" }
		);
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

	reportGame(
		gameId: string,
		message: string,
		category: "general" | "missing_score" | "missing_duration" = "general"
	) {
		return this.http.post(`${environment.apiUrl}/games/${gameId}/reports`, {
			message,
			category
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
					myLists: {
						id: string;
						name: string;
						isPublic: boolean;
						contains: boolean;
					}[];
				};
			}>(`${environment.apiUrl}/games/${gameId}/lists`)
			.pipe(map(res => res.data));
	}

	getFriendsActivity(gameId: string) {
		return this.http
			.get<{
				data: {
					friends: {
						username: string;
						name: string;
						avatarUrl: string | null;
						status: string;
						finishedAt: string | null;
						userRating: number | null;
					}[];
				};
			}>(`${environment.apiUrl}/games/${gameId}/friends-activity`)
			.pipe(map(res => res.data.friends));
	}

	getPlayers(gameId: string) {
		return this.http
			.get<{
				data: {
					players: {
						username: string;
						name: string;
						avatarUrl: string | null;
						status: string;
					}[];
				};
			}>(`${environment.apiUrl}/games/${gameId}/players`)
			.pipe(map(res => res.data.players));
	}
}
