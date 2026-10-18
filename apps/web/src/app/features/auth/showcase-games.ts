import { httpResource } from "@angular/common/http";

import { environment } from "../../../environments/environment";

export interface ShowcaseGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string;
}

export interface FeaturedShowcaseGame extends ShowcaseGame {
	score: number;
	hours: number;
	ratio: number;
}

export interface ShowcaseGamesResponse {
	data: {
		games: ShowcaseGame[];
		featured: FeaturedShowcaseGame | null;
	};
}

export function injectShowcaseGames() {
	return httpResource<ShowcaseGamesResponse>(
		() => `${environment.apiUrl}/games/showcase`
	);
}
