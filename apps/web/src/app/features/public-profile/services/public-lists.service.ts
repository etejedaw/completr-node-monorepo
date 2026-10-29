import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { buildHttpParams } from "../../../core/utils/http-params";
import {
	type PublicList,
	type PublicListsPage,
	type PublicListsQuery
} from "./public-lists.model";

@Injectable({ providedIn: "root" })
export class PublicListsService {
	private readonly http = inject(HttpClient);

	getUserLists(
		username: string,
		query: PublicListsQuery = {}
	): Observable<PublicListsPage> {
		return this.http
			.get<{
				data: { lists: PublicList[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/lists`, {
				params: buildHttpParams(query)
			})
			.pipe(
				map(res => ({ items: res.data.lists, total: res.data.total }))
			);
	}

	getUserFollowingLists(
		username: string,
		query: PublicListsQuery = {}
	): Observable<PublicListsPage> {
		return this.http
			.get<{
				data: { followingLists: PublicList[]; total: number };
			}>(`${environment.apiUrl}/users/${username}/following-lists`, {
				params: buildHttpParams(query)
			})
			.pipe(
				map(res => ({
					items: res.data.followingLists,
					total: res.data.total
				}))
			);
	}
}
