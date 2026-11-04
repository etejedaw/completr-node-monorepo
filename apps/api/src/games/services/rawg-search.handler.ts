import { titleToSlug } from "../../common/utils/title-to-slug.util";
import { type RawgClient } from "../../rawg/rawg.provider";
import { type ResolvedOnlineGame } from "../games.interface";
import { type OnlineSearchOutcome } from "../games.types";
import { OnlineSearchHandler } from "./online-search.handler";

const RAWG_SEARCH_PAGE_SIZE = 3;

export class RawgSearchHandler extends OnlineSearchHandler {
	protected readonly source = "rawg";

	constructor(
		private readonly rawg: RawgClient,
		private readonly resolveResult: (
			rawgId: number
		) => Promise<ResolvedOnlineGame | null>
	) {
		super();
	}

	protected async searchSource(query: string): Promise<OnlineSearchOutcome> {
		if (!this.rawg.isEnabled)
			return this.reportUnavailable("RAWG disabled");

		let results;
		try {
			results = await this.rawg.searchGame(query, {
				page_size: RAWG_SEARCH_PAGE_SIZE,
				exclude_additions: true
			});
		} catch (error) {
			return this.reportUnavailable("RAWG search failed", error);
		}

		const { resolved, failures } = await this.resolveCandidates(
			results,
			result => this.resolveResult(result.id),
			result => `RAWG ID ${result.id}`
		);
		const resolvedBySlug = await this.resolveBySlug(query);
		const ordered = resolvedBySlug
			? [resolvedBySlug, ...resolved]
			: resolved;

		if (ordered.length === 0 && failures > 0)
			return this.reportUnavailable(
				"every RAWG result failed to resolve"
			);
		return this.found(ordered);
	}

	private async resolveBySlug(
		query: string
	): Promise<ResolvedOnlineGame | null> {
		try {
			const detail = await this.rawg.getGameBySlug(titleToSlug(query));
			return await this.resolveResult(detail.id);
		} catch {
			return null;
		}
	}
}
