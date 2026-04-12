import { inject, Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { FavoriteEntry } from "../../core/models";

interface FavoritesResponse {
	data: { favorites: FavoriteEntry[] };
}

@Injectable({ providedIn: "root" })
export class FavoritesService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${environment.apiUrl}/users/me/favorites`;
	private readonly _favorites = signal<FavoriteEntry[]>([]);
	readonly favorites = this._favorites.asReadonly();

	load() {
		return this.http
			.get<FavoritesResponse>(this.baseUrl)
			.pipe(tap(res => this._favorites.set(res.data.favorites)));
	}

	isFavorite(gameId: string): boolean {
		return this._favorites().some(f => f.game.id === gameId);
	}

	replaceFavorites(gameIds: string[]) {
		return this.http.put<FavoritesResponse>(this.baseUrl, { gameIds }).pipe(
			tap(res => this._favorites.set(res.data.favorites)),
			map(res => res.data.favorites)
		);
	}

	toggle(gameId: string) {
		const current = this._favorites();
		const exists = current.some(f => f.game.id === gameId);

		let gameIds: string[];
		if (exists) {
			gameIds = current
				.filter(f => f.game.id !== gameId)
				.map(f => f.game.id);
		} else {
			gameIds = [...current.map(f => f.game.id), gameId];
		}

		return this.http
			.put<FavoritesResponse>(this.baseUrl, { gameIds })
			.pipe(tap(res => this._favorites.set(res.data.favorites)));
	}
}
