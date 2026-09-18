import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { map, type Observable, of, shareReplay, tap } from "rxjs";

import { environment } from "../../../environments/environment";
import { type WishlistEntry } from "../../core/models";
import { type Appendable, buildHttpParams } from "../../core/utils/http-params";

interface WishlistResponse {
	data: { wishlist: WishlistEntry[]; total?: number };
}

interface WishlistAddResponse {
	data: { wishlist: WishlistEntry };
}

interface WishlistGameIdsResponse {
	data: { gameIds: string[] };
}

export interface WishlistPagination extends Record<string, Appendable> {
	limit?: number;
	offset?: number;
	search?: string;
}

@Injectable({ providedIn: "root" })
export class WishlistService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/wishlist`;
	private readonly _wishlist = signal<WishlistEntry[]>([]);
	private readonly _gameIds = signal<Set<string>>(new Set());
	readonly wishlist = this._wishlist.asReadonly();
	private idsLoad$: Observable<Set<string>> | null = null;

	load(pagination: WishlistPagination = {}) {
		const params = buildHttpParams(pagination);
		return this.http.get<WishlistResponse>(this.baseUrl, { params }).pipe(
			tap(res => {
				this._wishlist.set(res.data.wishlist);
				if (!pagination.search && !pagination.offset) {
					this._gameIds.set(
						new Set(res.data.wishlist.map(w => w.game.id))
					);
				}
			})
		);
	}

	ensureIdsLoaded(): Observable<Set<string>> {
		if (this._gameIds().size > 0) return of(this._gameIds());
		if (this.idsLoad$) return this.idsLoad$;
		this.idsLoad$ = this.http
			.get<WishlistGameIdsResponse>(`${this.baseUrl}/game-ids`)
			.pipe(
				map(res => new Set(res.data.gameIds)),
				tap(ids => {
					this._gameIds.set(ids);
					this.idsLoad$ = null;
				}),
				shareReplay(1)
			);
		return this.idsLoad$;
	}

	isInWishlist(gameId: string): boolean {
		return this._gameIds().has(gameId);
	}

	add(gameId: string, platformId?: string) {
		const body: Record<string, string> = { gameId };
		if (platformId) body["platformId"] = platformId;
		return this.http.post<WishlistAddResponse>(this.baseUrl, body).pipe(
			tap(res => {
				this._wishlist.set([...this._wishlist(), res.data.wishlist]);
				this._gameIds.set(new Set(this._gameIds()).add(gameId));
			}),
			map(res => res.data.wishlist)
		);
	}

	remove(gameId: string) {
		return this.http.delete<void>(`${this.baseUrl}/${gameId}`).pipe(
			tap(() => {
				this._wishlist.set(
					this._wishlist().filter(w => w.game.id !== gameId)
				);
				const next = new Set(this._gameIds());
				next.delete(gameId);
				this._gameIds.set(next);
			})
		);
	}

	toggle(gameId: string): Observable<void> {
		return this.isInWishlist(gameId)
			? this.remove(gameId)
			: this.add(gameId).pipe(map(() => undefined));
	}

	replaceWishlist(gameIds: string[]) {
		return this.http.put<WishlistResponse>(this.baseUrl, { gameIds }).pipe(
			tap(res => {
				this._wishlist.set(res.data.wishlist);
				this._gameIds.set(
					new Set(res.data.wishlist.map(w => w.game.id))
				);
			}),
			map(res => res.data.wishlist)
		);
	}
}
