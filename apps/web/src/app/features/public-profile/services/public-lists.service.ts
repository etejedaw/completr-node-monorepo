import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";

export interface PublicList {
	id: string;
	name: string;
	description?: string;
	scoreSource: string;
	durationSource: string;
	followerCount: number;
	progress?: { completed: number; total: number };
}

@Injectable({ providedIn: "root" })
export class PublicListsService {
	private readonly http = inject(HttpClient);

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
}
