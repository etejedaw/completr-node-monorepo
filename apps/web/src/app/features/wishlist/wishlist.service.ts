import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { WishlistEntry } from "../../core/models";

interface WishlistListResponse {
	data: { wishlist: WishlistEntry[] };
}

interface WishlistSingleResponse {
	data: { wishlist: WishlistEntry };
}

@Injectable({ providedIn: "root" })
export class WishlistService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/wishlist`;

	getMyWishlist() {
		return this.http
			.get<WishlistListResponse>(this.baseUrl)
			.pipe(map(res => res.data.wishlist));
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
}
