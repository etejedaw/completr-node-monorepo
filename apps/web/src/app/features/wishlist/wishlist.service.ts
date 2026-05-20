import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map, switchMap } from "rxjs";
import { environment } from "../../../environments/environment";
import { WishlistEntry } from "../../core/models";

interface WishlistListResponse {
	data: { wishlist: WishlistEntry[]; total?: number };
}

interface WishlistSingleResponse {
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

	getMyWishlist(pagination: WishlistPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		if (pagination.search) params = params.set("search", pagination.search);
		return this.http
			.get<WishlistListResponse>(this.baseUrl, { params })
			.pipe(map(res => res.data.wishlist));
	}

	getMyWishlistPaged(pagination: WishlistPagination = {}) {
		let params = new HttpParams();
		if (pagination.limit !== undefined)
			params = params.set("limit", String(pagination.limit));
		if (pagination.offset !== undefined)
			params = params.set("offset", String(pagination.offset));
		if (pagination.search) params = params.set("search", pagination.search);
		return this.http.get<WishlistListResponse>(this.baseUrl, { params });
	}

	addFromGame(gameId: string, platformId: string) {
		return this.http
			.post<WishlistSingleResponse>(`${this.baseUrl}?source=game`, {
				id: gameId,
				platformId
			})
			.pipe(map(res => res.data.wishlist));
	}

	addFromBacklog(backlogId: string) {
		return this.http
			.post<WishlistSingleResponse>(`${this.baseUrl}?source=backlog`, {
				id: backlogId
			})
			.pipe(map(res => res.data.wishlist));
	}

	reorder(backlogIds: string[]) {
		return this.http
			.put<WishlistListResponse>(this.baseUrl, { backlogIds })
			.pipe(map(res => res.data.wishlist));
	}

	removeByBacklogId(backlogId: string) {
		return this.getMyWishlist().pipe(
			map(entries =>
				entries
					.filter(e => e.backlog.id !== backlogId)
					.map(e => e.backlog.id)
			),
			switchMap(remaining =>
				this.http
					.put<WishlistListResponse>(this.baseUrl, { backlogIds: remaining })
					.pipe(map(res => res.data.wishlist))
			)
		);
	}
}
