import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { forkJoin, map, of } from "rxjs";
import { environment } from "../../../environments/environment";

interface UserResult {
	id: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	isPublic: boolean;
}

interface GameResult {
	id: string;
	title: string;
	code: string;
	backgroundUrl?: string;
}

interface ListResult {
	id: string;
	name: string;
	description?: string;
}

export interface SearchResults {
	users: UserResult[];
	games: GameResult[];
	lists: ListResult[];
}

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
