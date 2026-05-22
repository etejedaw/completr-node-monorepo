import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { BacklogEntry } from "../../core/models/backlog.model";
import { FavoriteEntry } from "../../core/models/favorite.model";
import { QueueEntry } from "../../core/models/queue.model";
import { WishlistEntry } from "../../core/models/wishlist.model";
import { GameShelfEntry } from "../../core/models/game-shelf.model";

export interface PaginatedResult<T> {
	items: T[];
	total: number;
}

export interface PublicUser {
	id: string;
	username: string;
	role: string;
	name: string;
	bio?: string;
	avatarUrl?: string;
	isQueuePublic: boolean;
	isWishlistPublic: boolean;
	isFavoritePublic: boolean;
	isFeedPublic: boolean;
	isBacklogPublic: boolean;
	isShelfPublic: boolean;
	isListPublic: boolean;
	createdAt: string;
}

interface GameSummary {
	id: string;
	code: string;
	title: string;
	backgroundUrl?: string;
}

export interface PublicBacklog {
	id: string;
	status: string;
	score?: number;
	duration?: number;
	ratio?: number;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
}

export interface PublicList {
	id: string;
	name: string;
	description?: string;
	scoreSource: string;
	durationSource: string;
	followerCount: number;
	progress?: { completed: number; total: number };
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
		platform: { id: string; abbreviation: string };
	};
}

export interface PublicGameShelf {
	id: string;
	game: GameSummary & { description?: string };
	platform: { id: string; abbreviation: string };
}

export interface PublicActivity {
	id: string;
	type: string;
	createdAt: string;
	target: {
		type: "game" | "list" | "user";
		id: string;
		name: string;
		code?: string;
		username?: string;
	} | null;
}

export interface BacklogStats {
	not_started: number;
	playing: number;
	completed: number;
	abandoned: number;
	total: number;
}

export interface PublicProfile {
	user: PublicUser;
	isPrivate?: boolean;
	followerCount: number;
	followingCount: number;
	isFollowing: boolean;
	backlogs: PublicBacklog[];
	backlogTotal: number;
	backlogStats: BacklogStats;
	lists: PublicList[];
	favorites: PublicFavorite[];
	queue: PublicQueue[];
	wishlist: { id: string; position: number; game: GameSummary }[];
	gameShelf: PublicGameShelf[];
	followingLists: PublicList[];
	recentActivity: PublicActivity[];
}

@Injectable({ providedIn: "root" })
export class PublicProfileService {
	private readonly http = inject(HttpClient);

	getProfile(username: string) {
		return this.http
			.get<{
				data: PublicProfile;
			}>(`${environment.apiUrl}/users/${username}`)
			.pipe(map(res => res.data));
	}

	follow(username: string) {
		return this.http.post(
			`${environment.apiUrl}/users/${username}/follow`,
			{},
			{ responseType: "text" }
		);
	}

	getFollowers(username: string) {
		return this.http
			.get<{
				data: {
					users: {
						id: string;
						username: string;
						name: string;
						avatarUrl?: string;
					}[];
				};
			}>(`${environment.apiUrl}/users/${username}/followers`)
			.pipe(map(res => res.data.users));
	}

	getFollowing(username: string) {
		return this.http
			.get<{
				data: {
					users: {
						id: string;
						username: string;
						name: string;
						avatarUrl?: string;
					}[];
				};
			}>(`${environment.apiUrl}/users/${username}/following`)
			.pipe(map(res => res.data.users));
	}

	unfollow(username: string) {
		return this.http.delete(
			`${environment.apiUrl}/users/${username}/follow`
		);
	}

	getUserBacklog(
		username: string,
		filters: Record<string, string | number> = {}
	) {
		let params = new HttpParams();
		for (const [key, value] of Object.entries(filters)) {
			if (value !== undefined && value !== null && value !== "")
				params = params.set(key, String(value));
		}
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
		let params = new HttpParams();
		if (pagination.limit) params = params.set("limit", pagination.limit);
		if (pagination.offset) params = params.set("offset", pagination.offset);
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
		let params = new HttpParams();
		if (pagination.limit) params = params.set("limit", pagination.limit);
		if (pagination.offset) params = params.set("offset", pagination.offset);
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
		let params = new HttpParams();
		if (pagination.limit) params = params.set("limit", pagination.limit);
		if (pagination.offset) params = params.set("offset", pagination.offset);
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
		let params = new HttpParams();
		if (pagination.limit) params = params.set("limit", pagination.limit);
		if (pagination.offset) params = params.set("offset", pagination.offset);
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

	getUserFollowingLists(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		let params = new HttpParams();
		if (pagination.limit) params = params.set("limit", pagination.limit);
		if (pagination.offset) params = params.set("offset", pagination.offset);
		return this.http
			.get<{
				data: { followingLists: PublicList[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/following-lists`, {
				params
			})
			.pipe(
				map(res => ({
					items: res.data.followingLists,
					total: res.data.total
				}))
			);
	}

	getUserReviews(
		username: string,
		opts: { limit?: number; offset?: number } = {}
	) {
		let params = new HttpParams();
		if (opts.limit !== undefined)
			params = params.set("limit", String(opts.limit));
		if (opts.offset !== undefined)
			params = params.set("offset", String(opts.offset));
		return this.http
			.get<{
				data: {
					reviews: {
						id: string;
						content?: string;
						rating?: number;
						playthroughDuration?: number | null;
						game: {
							id: string;
							code: string;
							title: string;
						} | null;
						createdAt: string;
					}[];
					total: number;
				};
			}>(`${environment.apiUrl}/users/${username}/reviews`, { params })
			.pipe(map(res => res.data));
	}

}
