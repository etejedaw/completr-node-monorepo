import { inject, Injectable, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map, Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { WishlistEntry } from "../../core/models";

interface WishlistResponse {
	data: { wishlist: WishlistEntry[]; total?: number };
}

interface WishlistAddResponse {
	data: { wishlist: WishlistEntry };
}

export interface WishlistPagination {
	limit?: number;
	offset?: number;
	search?: string;
}

@Injectable({ providedIn: "root" })
export class WishlistService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/wishlist`;
	private readonly _wishlist = signal<WishlistEntry[]>([]);
	readonly wishlist = this._wishlist.asReadonly();

	load(pagination: WishlistPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		if (pagination.search) params = params.set("search", pagination.search);
		return this.http
			.get<WishlistResponse>(this.baseUrl, { params })
			.pipe(tap(res => this._wishlist.set(res.data.wishlist)));
	}

	isInWishlist(gameId: string): boolean {
		return this._wishlist().some(w => w.game.id === gameId);
	}

	add(gameId: string) {
		return this.http
			.post<WishlistAddResponse>(this.baseUrl, { gameId })
			.pipe(
				tap(res =>
					this._wishlist.set([...this._wishlist(), res.data.wishlist])
				),
				map(res => res.data.wishlist)
			);
	}

	remove(gameId: string) {
		return this.http.delete<void>(`${this.baseUrl}/${gameId}`).pipe(
			tap(() =>
				this._wishlist.set(
					this._wishlist().filter(w => w.game.id !== gameId)
				)
			)
		);
	}

	toggle(gameId: string): Observable<void> {
		return this.isInWishlist(gameId)
			? this.remove(gameId)
			: this.add(gameId).pipe(map(() => undefined));
	}

	replaceWishlist(gameIds: string[]) {
		return this.http
			.put<WishlistResponse>(this.baseUrl, { gameIds })
			.pipe(
				tap(res => this._wishlist.set(res.data.wishlist)),
				map(res => res.data.wishlist)
			);
	}
}
