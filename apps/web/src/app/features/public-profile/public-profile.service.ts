import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../environments/environment";
import { type VisibilityLevel } from "../../core/models/user.model";
import { type PublicBacklog } from "./services/public-library.service";

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
	game: {
		type: "game";
		id: string;
		name: string;
		code: string;
		backgroundUrl: string | null;
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
}
