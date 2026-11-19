import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, forkJoin, map, of } from "rxjs";

import { environment } from "../../../environments/environment";
import { type BacklogEntry } from "../models";
import {
	type GameResult,
	type ListResult,
	type SearchResults,
	type TagResult
} from "./global-search.model";
import { type UserResult } from "./users.model";

const LIBRARY_RESULTS_LIMIT = 10;
const TAG_RESULTS_LIMIT = 10;
const TAG_SEARCH_MAX_LENGTH = 40;

const EMPTY_RESULTS: SearchResults = {
	library: { entries: [], total: 0 },
	users: [],
	games: [],
	lists: [],
	tags: []
};

@Injectable({ providedIn: "root" })
export class GlobalSearchService {
	private readonly http = inject(HttpClient);

	search(query: string) {
		if (query.length < 2) return of(EMPTY_RESULTS);

		const search = encodeURIComponent(query);
		return forkJoin({
			library: this.http
				.get<{
					data: { backlog: BacklogEntry[]; total: number };
				}>(
					`${environment.apiUrl}/users/me/backlog?search=${search}&limit=${LIBRARY_RESULTS_LIMIT}`
				)
				.pipe(
					map(res => ({
						entries: res.data.backlog,
						total: res.data.total
					}))
				),
			users: this.http
				.get<{
					data: { users: UserResult[] };
				}>(`${environment.apiUrl}/users/search?search=${search}`)
				.pipe(map(res => res.data.users)),
			games: this.http
				.get<{
					data: { games: GameResult[] };
				}>(
					`${environment.apiUrl}/games/search?search=${search}&local_only=true`
				)
				.pipe(map(res => res.data.games)),
			lists: this.http
				.get<{
					data: { lists: ListResult[] };
				}>(`${environment.apiUrl}/lists/search?search=${search}`)
				.pipe(map(res => res.data.lists)),
			tags: this.searchTags(query)
		});
	}

	private searchTags(query: string) {
		const search = encodeURIComponent(
			query.slice(0, TAG_SEARCH_MAX_LENGTH)
		);
		return this.http
			.get<{
				data: { tags: TagResult[] };
			}>(
				`${environment.apiUrl}/tags/search?search=${search}&limit=${TAG_RESULTS_LIMIT}`
			)
			.pipe(
				map(res => res.data.tags),
				catchError(() => of([]))
			);
	}
}
