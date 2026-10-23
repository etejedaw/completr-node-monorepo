import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { EMPTY, expand, map, reduce } from "rxjs";

import { environment } from "../../../../environments/environment";
import { type UserResult } from "../../../core/services/users";
import { buildHttpParams } from "../../../core/utils/http-params";

export type PublicSocialUser = UserResult;

const MAX_CONNECTIONS_PAGE_SIZE = 100;

export type ConnectionsQuery = {
	limit?: number;
	offset?: number;
	search?: string;
};

export interface ConnectionsPage {
	users: UserResult[];
	total: number;
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

	getFollowers(username: string, query: ConnectionsQuery = {}) {
		return this.getConnections(username, "followers", query);
	}

	getFollowing(username: string, query: ConnectionsQuery = {}) {
		return this.getConnections(username, "following", query);
	}

	getAllFollowing(username: string) {
		const pageFrom = (offset: number) =>
			this.getFollowing(username, {
				limit: MAX_CONNECTIONS_PAGE_SIZE,
				offset
			});
		return pageFrom(0).pipe(
			expand((page, index) => {
				const nextOffset = (index + 1) * MAX_CONNECTIONS_PAGE_SIZE;
				return page.users.length > 0 && nextOffset < page.total
					? pageFrom(nextOffset)
					: EMPTY;
			}),
			reduce<ConnectionsPage, UserResult[]>(
				(users, page) => [...users, ...page.users],
				[]
			)
		);
	}

	private getConnections(
		username: string,
		kind: "followers" | "following",
		query: ConnectionsQuery
	) {
		return this.http
			.get<{
				data: ConnectionsPage;
			}>(`${environment.apiUrl}/users/${username}/${kind}`, {
				params: buildHttpParams(query)
			})
			.pipe(map(res => res.data));
	}
}
