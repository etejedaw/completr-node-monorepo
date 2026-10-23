import { httpResource } from "@angular/common/http";

import { environment } from "../../../environments/environment";

export interface ShowcaseGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string;
	releaseYear: number | null;
	genres: string[];
	score: number | null;
	hours: number | null;
	ratio: number | null;
}

export interface ShowcaseGamesResponse {
	data: {
		games: ShowcaseGame[];
	};
}

export function injectShowcaseGames() {
	return httpResource<ShowcaseGamesResponse>(
		() => `${environment.apiUrl}/games/showcase`
	);
}
