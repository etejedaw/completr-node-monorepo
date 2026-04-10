import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Game, Platform } from "../../core/models";

interface GamesSearchResponse {
	data: { games: Game[] };
}

interface PlatformsResponse {
	data: { platforms: Platform[] };
}

@Injectable({ providedIn: "root" })
export class GamesService {
	private readonly http = inject(HttpClient);

	search(query: string) {
		return this.http
			.get<GamesSearchResponse>(
				`${environment.apiUrl}/games/search?query=${encodeURIComponent(query)}`
			)
			.pipe(map(res => res.data.games));
	}

	getPlatforms() {
		return this.http
			.get<PlatformsResponse>(`${environment.apiUrl}/platforms`)
			.pipe(map(res => res.data.platforms));
	}
}
