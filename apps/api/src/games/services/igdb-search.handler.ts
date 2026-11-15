import { type IgdbGame } from "../../igdb/igdb.interface";
import {
	IGDB_IMPORT_LIMIT,
	IGDB_SEARCH_LIMIT,
	SEARCHABLE_IGDB_GAME_TYPES
} from "../games.constants";
import { type ResolvedOnlineGame } from "../games.interface";
import { type OnlineSearchOutcome } from "../games.types";
import {
	type ExternalDataRequestPacer,
	type IgdbSource
} from "../games-external-data.interface";
import { OnlineSearchHandler } from "./online-search.handler";

export class IgdbSearchHandler extends OnlineSearchHandler {
	protected readonly source = "igdb";

	constructor(
		private readonly getSource: () => IgdbSource | null,
		private readonly getPacer: () => ExternalDataRequestPacer,
		private readonly resolveResult: (
			game: IgdbGame
		) => Promise<ResolvedOnlineGame | null>
	) {
		super();
	}

	protected async searchSource(query: string): Promise<OnlineSearchOutcome> {
		const igdb = this.getSource();
		if (!igdb) return this.reportUnavailable("IGDB not registered");

		let results;
		try {
			await this.getPacer().waitForTurn();
			results = await igdb.searchGame(query, {
				limit: IGDB_SEARCH_LIMIT
			});
		} catch (error) {
			return this.reportUnavailable("IGDB search failed", error);
		}

		const candidates = results
			.filter(isSearchableGame)
			.slice(0, IGDB_IMPORT_LIMIT);
		const { resolved, failures } = await this.resolveCandidates(
			candidates,
			this.resolveResult,
			game => `IGDB ID ${game.id}`
		);

		if (resolved.length === 0 && failures > 0)
			return this.reportUnavailable(
				"every IGDB result failed to resolve"
			);
		return this.found(resolved);
	}
}

function isSearchableGame(game: IgdbGame): boolean {
	const gameType = game.game_type?.id;
	return gameType === undefined || SEARCHABLE_IGDB_GAME_TYPES.has(gameType);
}
