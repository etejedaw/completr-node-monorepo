import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";

export interface PublicUser {
	id: string;
	username: string;
	role: string;
	name: string;
	bio?: string;
	avatarUrl?: string;
	isWishlistPublic: boolean;
	isFavoritePublic: boolean;
	isFeedPublic: boolean;
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
}

export interface PublicFavorite {
	id: string;
	position: number;
	game: GameSummary;
}

export interface PublicWishlist {
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
	metadata: Record<string, unknown> | null;
	createdAt: string;
	game: GameSummary | null;
}

export interface PublicProfile {
	user: PublicUser;
	followerCount: number;
	followingCount: number;
	isFollowing: boolean;
	backlogs: PublicBacklog[];
	lists: PublicList[];
	favorites: PublicFavorite[];
	wishlist: PublicWishlist[];
	gameShelf: PublicGameShelf[];
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

	unfollow(username: string) {
		return this.http.delete(
			`${environment.apiUrl}/users/${username}/follow`
		);
	}
}
