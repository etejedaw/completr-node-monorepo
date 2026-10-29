import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type BacklogEntry } from "../../../core/models/backlog.model";
import { type FavoriteEntry } from "../../../core/models/favorite.model";
import { type GameShelfEntry } from "../../../core/models/game-shelf.model";
import { type PlatinumEntry } from "../../../core/models/platinum.model";
import { type QueueEntry } from "../../../core/models/queue.model";
import { type WishlistEntry } from "../../../core/models/wishlist.model";
import { buildHttpParams } from "../../../core/utils/http-params";
import { type TrackedFranchise } from "../../franchises/franchises.model";
import {
	type ComparisonDimension,
	type UserComparison
} from "./public-library.model";

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

	getUserPlatinums(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
		return this.http
			.get<{
				data: { platinums: PlatinumEntry[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/platinums`, { params })
			.pipe(
				map(res => ({
					items: res.data.platinums,
					total: res.data.total
				}))
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

	getUserFranchises(username: string) {
		return this.http
			.get<{
				data: { franchises: TrackedFranchise[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/franchises`)
			.pipe(map(res => res.data.franchises));
	}

	getComparison(
		username: string,
		by: ComparisonDimension,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams({ by, ...pagination });
		return this.http
			.get<{
				data: UserComparison;
			}>(`${environment.apiUrl}/users/${username}/comparison`, { params })
			.pipe(map(res => res.data));
	}
}
