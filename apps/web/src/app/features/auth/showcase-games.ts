import { httpResource } from "@angular/common/http";

import { environment } from "../../../environments/environment";
import { type ShowcaseGamesResponse } from "./showcase-games.model";

export function injectShowcaseGames() {
	return httpResource<ShowcaseGamesResponse>(
		() => `${environment.apiUrl}/games/showcase`
	);
}
