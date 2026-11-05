import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import {
	type OnlineSearchCooldown,
	type ResolvedOnlineGame
} from "../../src/games/games.interface";
import {
	type OnlineSearchOutcome,
	type OnlineSearchSource
} from "../../src/games/games.types";
import {
	ONLINE_SEARCH_UNAVAILABLE,
	OnlineSearchHandler
} from "../../src/games/services/online-search.handler";

const gameWithId = (id: string) => ({ id }) as Game;

class ScriptedHandler extends OnlineSearchHandler {
	readonly queries: string[] = [];

	constructor(
		protected readonly source: OnlineSearchSource,
		private readonly respond: (
			handler: ScriptedHandler
		) => Promise<OnlineSearchOutcome>,
		cooldown?: OnlineSearchCooldown
	) {
		super(cooldown);
	}

	protected searchSource(query: string): Promise<OnlineSearchOutcome> {
		this.queries.push(query);
		return this.respond(this);
	}

	foundFrom(resolved: ResolvedOnlineGame[]) {
		return this.found(resolved);
	}

	resolveEach(
		candidates: string[],
		resolve: (candidate: string) => Promise<ResolvedOnlineGame | null>
	) {
		return this.resolveCandidates(
			candidates,
			resolve,
			candidate => candidate
		);
	}
}

const unavailable = () => Promise.resolve(ONLINE_SEARCH_UNAVAILABLE);

void describe("OnlineSearchHandler", () => {
	void it("answers with the first source that is available and does not ask the next one", async () => {
		const rawg = new ScriptedHandler("rawg", handler =>
			Promise.resolve(handler.foundFrom([]))
		);
		const igdb = new ScriptedHandler("igdb", unavailable);
		rawg.setNext(igdb);

		const outcome = await rawg.handle("zelda");

		assert.deepEqual(outcome, {
			available: true,
			source: "rawg",
			games: [],
			importedIds: new Set()
		});
		assert.deepEqual(igdb.queries, []);
	});

	void it("delegates the same query to the next source when the current one is unavailable", async () => {
		const rawg = new ScriptedHandler("rawg", unavailable);
		const igdb = new ScriptedHandler("igdb", handler =>
			Promise.resolve(
				handler.foundFrom([
					{ game: gameWithId("g1"), justImported: true }
				])
			)
		);
		rawg.setNext(igdb);

		const outcome = await rawg.handle("zelda");

		assert.equal(outcome.available && outcome.source, "igdb");
		assert.deepEqual(igdb.queries, ["zelda"]);
	});

	void it("is unavailable when every source in the chain is unavailable", async () => {
		const rawg = new ScriptedHandler("rawg", unavailable);
		rawg.setNext(new ScriptedHandler("igdb", unavailable));

		assert.deepEqual(await rawg.handle("zelda"), ONLINE_SEARCH_UNAVAILABLE);
	});

	void it("returns the handler passed to setNext so links can be chained", () => {
		const rawg = new ScriptedHandler("rawg", unavailable);
		const igdb = new ScriptedHandler("igdb", unavailable);

		assert.equal(rawg.setNext(igdb), igdb);
	});

	void it("keeps each game once, in its first position, and remembers that it was imported", () => {
		const handler = new ScriptedHandler("rawg", unavailable);

		const outcome = handler.foundFrom([
			{ game: gameWithId("a"), justImported: false },
			{ game: gameWithId("b"), justImported: false },
			{ game: gameWithId("a"), justImported: true }
		]);

		assert.deepEqual(
			outcome.games.map(game => game.id),
			["a", "b"]
		);
		assert.deepEqual([...outcome.importedIds], ["a"]);
	});

	void it("counts the candidates that fail to resolve and keeps the others", async () => {
		const handler = new ScriptedHandler("igdb", unavailable);

		const { resolved, failures } = await handler.resolveEach(
			["ok", "boom", "skip", "ok-too"],
			candidate => {
				if (candidate === "boom")
					return Promise.reject(new Error(candidate));
				if (candidate === "skip") return Promise.resolve(null);
				return Promise.resolve({
					game: gameWithId(candidate),
					justImported: true
				});
			}
		);

		assert.deepEqual(
			resolved.map(entry => entry.game.id),
			["ok", "ok-too"]
		);
		assert.equal(failures, 1);
	});

	void describe("cooldown after a failure", () => {
		const COOLDOWN_MS = 120_000;

		function rawgFound(): OnlineSearchOutcome {
			return {
				available: true,
				source: "rawg",
				games: [],
				importedIds: new Set()
			};
		}

		function chainWithClock(responses: OnlineSearchOutcome[]) {
			let clock = 1_000;
			const rawg = new ScriptedHandler(
				"rawg",
				() =>
					Promise.resolve(
						responses.shift() ?? ONLINE_SEARCH_UNAVAILABLE
					),
				{ durationMs: COOLDOWN_MS, now: () => clock }
			);
			const igdb = new ScriptedHandler("igdb", handler =>
				Promise.resolve(handler.foundFrom([]))
			);
			rawg.setNext(igdb);
			return {
				rawg,
				igdb,
				advance: (milliseconds: number) => {
					clock += milliseconds;
				}
			};
		}

		void it("skips the failing source and goes straight to the next one while it cools down", async () => {
			const { rawg, igdb, advance } = chainWithClock([]);

			await rawg.handle("first");
			advance(COOLDOWN_MS - 1);
			const outcome = await rawg.handle("second");

			assert.deepEqual(rawg.queries, ["first"]);
			assert.deepEqual(igdb.queries, ["first", "second"]);
			assert.equal(outcome.available && outcome.source, "igdb");
		});

		void it("asks the source again once the cooldown is over and forgets the failure if it answers", async () => {
			const { rawg, igdb, advance } = chainWithClock([
				ONLINE_SEARCH_UNAVAILABLE,
				rawgFound(),
				rawgFound()
			]);

			await rawg.handle("first");
			advance(COOLDOWN_MS);
			const recovered = await rawg.handle("second");
			const afterRecovery = await rawg.handle("third");

			assert.deepEqual(rawg.queries, ["first", "second", "third"]);
			assert.deepEqual(igdb.queries, ["first"]);
			assert.equal(recovered.available && recovered.source, "rawg");
			assert.equal(
				afterRecovery.available && afterRecovery.source,
				"rawg"
			);
		});

		void it("starts a new cooldown when the source fails again after the previous one", async () => {
			const { rawg, advance } = chainWithClock([]);

			await rawg.handle("first");
			advance(COOLDOWN_MS);
			await rawg.handle("second");
			advance(COOLDOWN_MS - 1);
			await rawg.handle("third");

			assert.deepEqual(rawg.queries, ["first", "second"]);
		});

		void it("does not remember failures when the cooldown is zero", async () => {
			const rawg = new ScriptedHandler("rawg", unavailable);
			rawg.setNext(
				new ScriptedHandler("igdb", handler =>
					Promise.resolve(handler.foundFrom([]))
				)
			);

			await rawg.handle("first");
			await rawg.handle("second");

			assert.deepEqual(rawg.queries, ["first", "second"]);
		});

		void it("lets every concurrent search that started before the failure try the source once", async () => {
			const { rawg } = chainWithClock([]);

			await Promise.all([rawg.handle("a"), rawg.handle("b")]);
			await rawg.handle("c");

			assert.deepEqual(rawg.queries, ["a", "b"]);
		});
	});
});
