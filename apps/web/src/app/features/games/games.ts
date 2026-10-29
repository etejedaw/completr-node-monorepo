import {
	HttpClient,
	HttpContext,
	type HttpErrorResponse
} from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, map, throwError } from "rxjs";

import { environment } from "../../../environments/environment";
import {
	type BacklogStatus,
	type Game,
	type UserRole
} from "../../core/models";
import { ToastService } from "../../core/services/toast";
import { buildHttpParams } from "../../core/utils/http-params";
import { SUPPRESS_VALIDATION_TOAST } from "../../shared/utils/validation-errors";
import {
	type CompilationItemResponse,
	type CreateGameDto,
	type GamesQuery,
	type GamesResponse,
	type GamesSearchResponse,
	type GenresResponse,
	type PlatformsResponse,
	type RawgDetail,
	type SetCompilationItemsDto,
	type SplitGameDto,
	type UpdateGameDto
} from "./games.model";

const RATE_LIMITED_STATUS = 429;
const ONLINE_SEARCH_FAILED_MESSAGE =
	"Couldn't search online right now. Try again in a moment.";

const SUPPRESS_TOAST_CONTEXT = new HttpContext().set(
	SUPPRESS_VALIDATION_TOAST,
	true
);

@Injectable({ providedIn: "root" })
export class GamesService {
	private readonly http = inject(HttpClient);
	private readonly toast = inject(ToastService);

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
			.pipe(
				map(res => res.data.games),
				catchError((error: HttpErrorResponse) => {
					if (forceRawg && error.status !== RATE_LIMITED_STATUS)
						this.toast.warning(ONLINE_SEARCH_FAILED_MESSAGE);
					return throwError(() => error);
				})
			);
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

	replaceScores(gameId: string, scores: { source: string; score: number }[]) {
		return this.http.put(
			`${environment.apiUrl}/games/${gameId}/scores`,
			{ scores },
			{ context: SUPPRESS_TOAST_CONTEXT }
		);
	}

	replaceTimes(
		gameId: string,
		times: { source: string; duration: number }[]
	) {
		return this.http.put(
			`${environment.apiUrl}/games/${gameId}/times`,
			{ times },
			{ context: SUPPRESS_TOAST_CONTEXT }
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
						role: UserRole;
						status: BacklogStatus;
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
						role: UserRole;
						status: BacklogStatus;
					}[];
				};
			}>(`${environment.apiUrl}/games/${gameId}/players`)
			.pipe(map(res => res.data.players));
	}
}
