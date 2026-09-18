import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";

import { environment } from "../../../../environments/environment";

export interface PublicSocialUser {
	id: string;
	username: string;
	name: string;
	avatarUrl?: string;
}

export interface FollowResult {
	status: "accepted" | "pending";
	targetId: string;
}

@Injectable({ providedIn: "root" })
export class PublicSocialService {
	private readonly http = inject(HttpClient);

	follow(username: string) {
		return this.http
			.post<{
				data: FollowResult;
			}>(`${environment.apiUrl}/users/${username}/follow`, {})
			.pipe(map(res => res.data));
	}

	unfollow(username: string) {
		return this.http.delete(
			`${environment.apiUrl}/users/${username}/follow`
		);
	}

	cancelFollowRequest(username: string) {
		return this.http.delete(
			`${environment.apiUrl}/users/me/follow-requests/sent/${username}`
		);
	}

	getFollowers(username: string) {
		return this.http
			.get<{
				data: { users: PublicSocialUser[] };
			}>(`${environment.apiUrl}/users/${username}/followers`)
			.pipe(map(res => res.data.users));
	}

	getFollowing(username: string) {
		return this.http
			.get<{
				data: { users: PublicSocialUser[] };
			}>(`${environment.apiUrl}/users/${username}/following`)
			.pipe(map(res => res.data.users));
	}
}
