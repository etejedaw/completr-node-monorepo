import { PinoLogger } from "../../common/logger/pino.logger";
import {
	type OnlineSearchFound,
	type ResolvedOnlineGame
} from "../games.interface";
import {
	type OnlineSearchOutcome,
	type OnlineSearchSource
} from "../games.types";

export const ONLINE_SEARCH_UNAVAILABLE: OnlineSearchOutcome = {
	available: false
};

export abstract class OnlineSearchHandler {
	protected abstract readonly source: OnlineSearchSource;
	protected readonly logger = new PinoLogger("OnlineSearch");
	private next: OnlineSearchHandler | null = null;

	setNext(handler: OnlineSearchHandler): OnlineSearchHandler {
		this.next = handler;
		return handler;
	}

	async handle(query: string): Promise<OnlineSearchOutcome> {
		const outcome = await this.searchSource(query);
		if (outcome.available || !this.next) return outcome;
		return this.next.handle(query);
	}

	protected abstract searchSource(
		query: string
	): Promise<OnlineSearchOutcome>;

	protected async resolveCandidates<TCandidate>(
		candidates: readonly TCandidate[],
		resolve: (candidate: TCandidate) => Promise<ResolvedOnlineGame | null>,
		describe: (candidate: TCandidate) => string
	): Promise<{ resolved: ResolvedOnlineGame[]; failures: number }> {
		const resolved: ResolvedOnlineGame[] = [];
		let failures = 0;

		for (const candidate of candidates) {
			try {
				const result = await resolve(candidate);
				if (result) resolved.push(result);
			} catch (error) {
				failures++;
				this.logger.warn(
					`${this.source}Search`,
					`Failed to resolve ${describe(candidate)}`,
					error
				);
			}
		}

		return { resolved, failures };
	}

	protected found(
		resolved: readonly ResolvedOnlineGame[]
	): OnlineSearchFound {
		const outcome: OnlineSearchFound = {
			available: true,
			source: this.source,
			games: [],
			importedIds: new Set<string>()
		};

		for (const { game, justImported } of resolved) {
			if (justImported) outcome.importedIds.add(game.id);
			if (outcome.games.some(existing => existing.id === game.id))
				continue;
			outcome.games.push(game);
		}

		return outcome;
	}

	protected reportUnavailable(reason: string, error?: unknown) {
		this.logger.warn(`${this.source}Search`, reason, error);
		return ONLINE_SEARCH_UNAVAILABLE;
	}
}
