import { inject, Injectable, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map, of, shareReplay, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { FavoriteEntry } from "../../core/models";
import { Appendable, buildHttpParams } from "../../core/utils/http-params";

interface FavoritesResponse {
	data: { favorites: FavoriteEntry[]; total?: number };
}

export interface FavoritesPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

@Injectable({ providedIn: "root" })
export class FavoritesService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/favorites`;
	private readonly _favorites = signal<FavoriteEntry[]>([]);
	private readonly _favoriteIds = signal<Set<string>>(new Set());
	readonly favorites = this._favorites.asReadonly();
	readonly favoriteIds = this._favoriteIds.asReadonly();
	private idsLoad$: Observable<Set<string>> | null = null;

	load(pagination: FavoritesPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<FavoritesResponse>(this.baseUrl, { params }).pipe(
			tap(res => {
				this._favorites.set(res.data.favorites);
				if (!pagination.search && !pagination.offset) {
					this._favoriteIds.set(
						new Set(res.data.favorites.map(f => f.game.id))
					);
				}
			})
		);
	}

	ensureIdsLoaded(): Observable<Set<string>> {
		if (this._favoriteIds().size > 0) return of(this._favoriteIds());
		if (this.idsLoad$) return this.idsLoad$;
		const params = new HttpParams().set("limit", "100");
		this.idsLoad$ = this.http
			.get<FavoritesResponse>(this.baseUrl, { params })
			.pipe(
				map(res => new Set(res.data.favorites.map(f => f.game.id))),
				tap(ids => {
					this._favoriteIds.set(ids);
					this.idsLoad$ = null;
				}),
				shareReplay(1)
			);
		return this.idsLoad$;
	}

	isFavorite(gameId: string): boolean {
		return this._favoriteIds().has(gameId);
	}

	replaceFavorites(gameIds: string[]) {
		return this.http.put<FavoritesResponse>(this.baseUrl, { gameIds }).pipe(
			tap(res => {
				this._favorites.set(res.data.favorites);
				this._favoriteIds.set(
					new Set(res.data.favorites.map(f => f.game.id))
				);
			}),
			map(res => res.data.favorites)
		);
	}

	toggle(gameId: string) {
		const previousIds = this._favoriteIds();
		const wasFavorite = previousIds.has(gameId);
		const nextIds = new Set(previousIds);
		if (wasFavorite) nextIds.delete(gameId);
		else nextIds.add(gameId);
		this._favoriteIds.set(nextIds);

		const gameIds = Array.from(nextIds);

		return this.http.put<FavoritesResponse>(this.baseUrl, { gameIds }).pipe(
			tap({
				next: res => {
					this._favorites.set(res.data.favorites);
					this._favoriteIds.set(
						new Set(res.data.favorites.map(f => f.game.id))
					);
				},
				error: () => this._favoriteIds.set(previousIds)
			})
		);
	}
}
