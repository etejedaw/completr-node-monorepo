import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { BacklogEntry } from "../../core/models/backlog.model";
import { FavoriteEntry } from "../../core/models/favorite.model";
import { QueueEntry } from "../../core/models/queue.model";
import { WishlistEntry } from "../../core/models/wishlist.model";
import { GameShelfEntry } from "../../core/models/game-shelf.model";
import { VisibilityLevel } from "../../core/models/user.model";
import { buildHttpParams } from "../../core/utils/http-params";

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
	profileVisibility: VisibilityLevel;
	queueVisibility: VisibilityLevel;
	wishlistVisibility: VisibilityLevel;
	favoriteVisibility: VisibilityLevel;
	feedVisibility: VisibilityLevel;
	backlogVisibility: VisibilityLevel;
	shelfVisibility: VisibilityLevel;
	listVisibility: VisibilityLevel;
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
		platform?: { id: string; abbreviation: string };
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

export interface HighlightEntry {
	id: string;
	status: string;
	userRating?: number | null;
	realDuration?: number | null;
	finishedAt?: string | null;
	game: GameSummary;
	platform: { id: string; abbreviation: string };
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
	profileVisibility?: VisibilityLevel;
	acceptFollowRequests?: boolean;
	hasPendingRequest?: boolean;
	followerCount: number;
	followingCount: number;
	isFollowing: boolean;
	backlogs: PublicBacklog[];
	backlogTotal: number;
	backlogStats: BacklogStats;
	listsTotal: number;
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
		return this.http
			.post<{
				data: { status: "accepted" | "pending"; targetId: string };
			}>(`${environment.apiUrl}/users/${username}/follow`, {})
			.pipe(map(res => res.data));
	}

	cancelFollowRequest(username: string) {
		return this.http.delete(
			`${environment.apiUrl}/users/me/follow-requests/sent/${username}`
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

	getUserLists(username: string) {
		return this.http
			.get<{
				data: { lists: PublicList[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/lists`)
			.pipe(
				map(res => ({ items: res.data.lists, total: res.data.total }))
			);
	}

	getUserFollowingLists(
		username: string,
		pagination: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(pagination);
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
		const params = buildHttpParams(opts);
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

	getUserCompletions(
		username: string,
		opts: { limit?: number; offset?: number } = {}
	) {
		const params = buildHttpParams(opts);
		return this.http
			.get<{
				data: {
					completions: {
						id: string;
						status: string;
						userRating?: number | null;
						realDuration?: number | null;
						finishedAt?: string | null;
						reviewContent: string | null;
						game: {
							id: string;
							code: string;
							title: string;
							backgroundUrl?: string;
						};
						platform: { id: string; abbreviation: string };
					}[];
					total: number;
				};
			}>(`${environment.apiUrl}/users/${username}/completions`, { params })
			.pipe(map(res => res.data));
	}

	getHighlights(
		username: string,
		opts: { year?: number; month?: number } = {}
	) {
		const params = buildHttpParams(opts);
		return this.http
			.get<{
				data: {
					highlights: {
						recent: HighlightEntry[];
						month: {
							startsAt: string;
							endsAt: string;
							completedCount: number;
							mostPlayed: HighlightEntry | null;
							highestRated: HighlightEntry | null;
						};
					};
				};
			}>(`${environment.apiUrl}/users/${username}/highlights`, { params })
			.pipe(map(res => res.data.highlights));
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
