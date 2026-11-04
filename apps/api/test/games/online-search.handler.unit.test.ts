import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type ResolvedOnlineGame } from "../../src/games/games.interface";
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
		) => Promise<OnlineSearchOutcome>
	) {
		super();
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
});
