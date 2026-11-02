import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { forkJoin, map, of } from "rxjs";

import { environment } from "../../../environments/environment";
import { type GameResult, type ListResult } from "./global-search.model";
import { type UserResult } from "./users.model";

@Injectable({ providedIn: "root" })
export class GlobalSearchService {
	private readonly http = inject(HttpClient);

	search(query: string) {
		if (query.length < 2) return of({ users: [], games: [], lists: [] });

		return forkJoin({
			users: this.http
				.get<{
					data: { users: UserResult[] };
				}>(
					`${environment.apiUrl}/users/search?q=${encodeURIComponent(query)}`
				)
				.pipe(map(res => res.data.users)),
			games: this.http
				.get<{
					data: { games: GameResult[] };
				}>(
					`${environment.apiUrl}/games/search?query=${encodeURIComponent(query)}&local_only=true`
				)
				.pipe(map(res => res.data.games)),
			lists: this.http
				.get<{
					data: { lists: ListResult[] };
				}>(
					`${environment.apiUrl}/lists/search?query=${encodeURIComponent(query)}`
				)
				.pipe(map(res => res.data.lists))
		});
	}
}
