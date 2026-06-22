import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { BacklogEntry } from "../../../core/models/backlog.model";
import { FavoriteEntry } from "../../../core/models/favorite.model";
import { QueueEntry } from "../../../core/models/queue.model";
import { WishlistEntry } from "../../../core/models/wishlist.model";
import { GameShelfEntry } from "../../../core/models/game-shelf.model";
import { buildHttpParams } from "../../../core/utils/http-params";
import { GameSummary } from "./types";

export interface PublicBacklog {
	id: string;
	status: string;
	score?: number;
	duration?: number;
	ratio?: number;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
}

export interface PublicFavorite {
	id: string;
	position: number;
	game: GameSummary;
}

export interface PublicQueue {
	id: string;
	position: number;
	backlog: {
		id: string;
		status: string;
		game: GameSummary;
		platform?: { id: string; abbreviation: string };
	};
}

export interface PublicGameShelf {
	id: string;
	game: GameSummary & { description?: string };
	platform: { id: string; abbreviation: string };
}

@Injectable({ providedIn: "root" })
export class PublicLibraryService {
	private readonly http = inject(HttpClient);

	getUserBacklog(
		username: string,
		filters: Record<string, string | number> = {}
	) {
		const params = buildHttpParams(filters);
		return this.http
			.get<{
				data: { backlog: BacklogEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/backlog`, { params })
			.pipe(
				map(res => ({ items: res.data.backlog, total: res.data.total }))
			);
	}

	getUserFavorites(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<{
				data: { favorites: FavoriteEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/favorites`, { params })
			.pipe(
				map(res => ({
					items: res.data.favorites,
					total: res.data.total
				}))
			);
	}

	getUserQueue(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<{
				data: { queue: QueueEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/queue`, { params })
			.pipe(
				map(res => ({
					items: res.data.queue,
					total: res.data.total
				}))
			);
	}

	getUserWishlist(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<{
				data: { wishlist: WishlistEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/wishlist`, { params })
			.pipe(
				map(res => ({
					items: res.data.wishlist,
					total: res.data.total
				}))
			);
	}

	getUserGameShelf(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<{
				data: { gameShelf: GameShelfEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/game-shelf`, { params })
			.pipe(
				map(res => ({
					items: res.data.gameShelf,
					total: res.data.total
				}))
			);
	}

	getGamesInCommon(username: string) {
		return this.http
			.get<{
				data: {
					games: {
						id: string;
						code: string;
						title: string;
						backgroundUrl: string | null;
					}[];
					total: number;
				};
			}>(`${environment.apiUrl}/users/${username}/games-in-common`)
			.pipe(map(res => res.data));
	}
}
