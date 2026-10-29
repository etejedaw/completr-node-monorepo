import { HttpClient } from "@angular/common/http";
import { effect, inject, Injectable, signal } from "@angular/core";
import {
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	tap,
	throwError
} from "rxjs";

import { environment } from "../../../environments/environment";
import { type FavoriteEntry } from "../../core/models";
import { AuthService } from "../../core/services/auth";
import { ToastService } from "../../core/services/toast";
import { buildHttpParams } from "../../core/utils/http-params";
import {
	type FavoriteGameIdsResponse,
	type FavoritesPagination,
	type FavoritesResponse
} from "./favorites.model";

const MAX_FAVORITES = 100;

@Injectable({ providedIn: "root" })
export class FavoritesService {
	private readonly http = inject(HttpClient);
	private readonly auth = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly baseUrl = `${environment.apiUrl}/users/me/favorites`;
	private readonly _favorites = signal<FavoriteEntry[]>([]);
	private readonly _favoriteIds = signal<Set<string>>(new Set());
	readonly favorites = this._favorites.asReadonly();
	readonly favoriteIds = this._favoriteIds.asReadonly();
	private idsLoaded = false;
	private idsLoad$: Observable<Set<string>> | null = null;

	constructor() {
		let previousUserId: string | null = null;
		effect(() => {
			const userId = this.auth.user()?.id ?? null;
			if (previousUserId !== null && userId !== previousUserId)
				this.reset();
			previousUserId = userId;
		});
	}

	private reset() {
		this.idsLoaded = false;
		this.idsLoad$ = null;
		this._favorites.set([]);
		this._favoriteIds.set(new Set());
	}

	load(pagination: FavoritesPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<FavoritesResponse>(this.baseUrl, { params }).pipe(
			tap(res => {
				this._favorites.set(res.data.favorites);
				if (!pagination.search && !pagination.offset) {
					this.idsLoaded = true;
					this._favoriteIds.set(
						new Set(res.data.favorites.map(f => f.game.id))
					);
				}
			})
		);
	}

	ensureIdsLoaded(): Observable<Set<string>> {
		if (this.idsLoaded) return of(this._favoriteIds());
		if (this.idsLoad$) return this.idsLoad$;
		this.idsLoad$ = this.http
			.get<FavoriteGameIdsResponse>(`${this.baseUrl}/game-ids`)
			.pipe(
				map(res => new Set(res.data.gameIds)),
				tap(ids => {
					this._favoriteIds.set(ids);
					this.idsLoaded = true;
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
				this.idsLoaded = true;
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
		if (!wasFavorite && previousIds.size >= MAX_FAVORITES) {
			this.toast.error(
				`You can only have up to ${MAX_FAVORITES} favorites.`
			);
			return throwError(() => new Error("Favorites limit reached"));
		}
		const nextIds = new Set(previousIds);
		if (wasFavorite) nextIds.delete(gameId);
		else nextIds.add(gameId);
		this._favoriteIds.set(nextIds);

		const gameIds = Array.from(nextIds);

		return this.http.put<FavoritesResponse>(this.baseUrl, { gameIds }).pipe(
			tap({
				next: res => {
					this._favorites.set(res.data.favorites);
					this.idsLoaded = true;
					this._favoriteIds.set(
						new Set(res.data.favorites.map(f => f.game.id))
					);
				},
				error: () => this._favoriteIds.set(previousIds)
			})
		);
	}

	removeFavorite(gameId: string) {
		return this.ensureIdsLoaded().pipe(
			switchMap(ids => {
				const next = new Set(ids);
				next.delete(gameId);
				const gameIds = Array.from(next);
				return this.http
					.put<FavoritesResponse>(this.baseUrl, { gameIds })
					.pipe(
						tap(res => {
							this._favorites.set(res.data.favorites);
							this._favoriteIds.set(
								new Set(res.data.favorites.map(f => f.game.id))
							);
						})
					);
			})
		);
	}
}
