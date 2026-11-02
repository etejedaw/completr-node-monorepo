import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ExternalDataSource } from "../../src/games/games.constants";
import {
	type ExternalDataCandidate,
	type ExternalDataGame,
	type ExternalDataResult
} from "../../src/games/games-external-data.interface";
import {
	createImportEnrichmentQueue,
	type ImportEnrichmentQueueDependencies
} from "../../src/games/services/games-import-enrichment.service";
import { deferred } from "./external-data-fakes.helper";

const PAUSE_MS = 600_000;

type LogLevel = "debug" | "info" | "warn" | "error";

function recordingLogger() {
	const entries: { level: LogLevel; result: string; extra?: unknown }[] = [];
	const record =
		(level: LogLevel) =>
		(_operation: string, result: string, extra?: unknown) =>
			entries.push({ level, result, extra });
	return {
		entries,
		logger: {
			debug: record("debug"),
			info: record("info"),
			warn: record("warn"),
			error: record("error")
		}
	};
}

function candidateOf(
	gameId: string,
	sources: ExternalDataSource[] = ["metacritic", "hltb"]
): ExternalDataCandidate {
	return { game: { id: gameId, title: `Game ${gameId}` }, sources };
}

function updated(source: ExternalDataSource): ExternalDataResult {
	return { source, status: "updated", errorCode: null };
}

function failed(
	source: ExternalDataSource,
	errorCode: string | null
): ExternalDataResult {
	return { source, status: "failed", errorCode };
}

function buildQueue(
	overrides: Partial<ImportEnrichmentQueueDependencies> = {}
) {
	const clock = { now: 1_000 };
	const refreshed: { gameId: string; sources: ExternalDataSource[] }[] = [];
	const { entries, logger } = recordingLogger();
	const queue = createImportEnrichmentQueue({
		findCandidate: async gameId => candidateOf(gameId),
		refresh: async (game: ExternalDataGame, sources) => {
			refreshed.push({ gameId: game.id, sources: [...sources] });
			return sources.map(updated);
		},
		availableSources: () => ["metacritic", "hltb"],
		now: () => clock.now,
		logger,
		capacity: 50,
		pauseMs: PAUSE_MS,
		...overrides
	});
	return { queue, clock, refreshed, logs: entries };
}

function warnings(logs: { level: LogLevel; result: string }[]) {
	return logs.filter(entry => entry.level === "warn").map(e => e.result);
}

void describe("import enrichment queue", () => {
	void it("returns before the enrichment runs and processes games one at a time in order", async () => {
		const gate = deferred<undefined>();
		let running = 0;
		let maxRunning = 0;
		const order: string[] = [];
		const { queue } = buildQueue({
			refresh: async (game, sources) => {
				running++;
				maxRunning = Math.max(maxRunning, running);
				await gate.promise;
				order.push(game.id);
				running--;
				return sources.map(updated);
			}
		});

		queue.enqueue(["a", "b", "c"]);
		assert.deepEqual(order, []);
		gate.resolve(undefined);
		await queue.whenIdle();

		assert.deepEqual(order, ["a", "b", "c"]);
		assert.equal(maxRunning, 1);
		assert.equal(queue.size(), 0);
	});

	void it("does not enqueue a game that is already waiting or in progress, nor repeated ids in one call", async () => {
		const gate = deferred<undefined>();
		const { queue, refreshed } = buildQueue({
			findCandidate: async gameId => {
				await gate.promise;
				return candidateOf(gameId);
			}
		});

		queue.enqueue(["a", "a", "b"]);
		queue.enqueue(["a"]);
		queue.enqueue(["b", "c"]);
		assert.equal(queue.size(), 3);
		gate.resolve(undefined);
		await queue.whenIdle();

		assert.deepEqual(
			refreshed.map(entry => entry.gameId),
			["a", "b", "c"]
		);
	});

	void it("accepts a game again once its previous enrichment finished", async () => {
		const { queue, refreshed } = buildQueue();

		queue.enqueue(["a"]);
		await queue.whenIdle();
		queue.enqueue(["a"]);
		await queue.whenIdle();

		assert.equal(refreshed.length, 2);
	});

	void it("drops what exceeds the capacity with a warning", async () => {
		const gate = deferred<undefined>();
		const { queue, refreshed, logs } = buildQueue({
			capacity: 2,
			findCandidate: async gameId => {
				await gate.promise;
				return candidateOf(gameId);
			}
		});

		queue.enqueue(["a", "b", "c", "d"]);
		gate.resolve(undefined);
		await queue.whenIdle();

		assert.deepEqual(
			refreshed.map(entry => entry.gameId),
			["a", "b"]
		);
		const dropped = logs.find(
			entry => entry.result === "queue full: imported games dropped"
		);
		assert.deepEqual((dropped?.extra as { gameIds: string[] }).gameIds, [
			"c",
			"d"
		]);
	});

	void it("asks only for the missing sources that are registered and skips complete games", async () => {
		const candidates: Record<string, ExternalDataCandidate> = {
			complete: candidateOf("complete", []),
			"no-score": candidateOf("no-score", ["metacritic"]),
			"no-time": candidateOf("no-time", ["hltb"])
		};
		const { queue, refreshed } = buildQueue({
			findCandidate: async gameId => candidates[gameId] ?? null,
			availableSources: () => ["hltb"]
		});

		queue.enqueue(["complete", "no-score", "no-time", "inactive"]);
		await queue.whenIdle();

		assert.deepEqual(refreshed, [{ gameId: "no-time", sources: ["hltb"] }]);
	});

	void it("does nothing when no source is registered", async () => {
		let lookups = 0;
		const { queue } = buildQueue({
			availableSources: () => [],
			findCandidate: async gameId => {
				lookups++;
				return candidateOf(gameId);
			}
		});

		queue.enqueue(["a", "b"]);
		await queue.whenIdle();

		assert.equal(lookups, 0);
		assert.equal(queue.size(), 0);
	});

	for (const errorCode of [
		"HLTB_BLOCKED",
		"METACRITIC_RATE_LIMITED",
		"WIKIDATA_RATE_LIMITED"
	]) {
		void it(`empties the queue and pauses on ${errorCode} until the pause expires`, async () => {
			const { queue, clock, refreshed, logs } = buildQueue({
				refresh: async (game, sources) => {
					refreshed.push({ gameId: game.id, sources: [...sources] });
					return game.id === "a"
						? [updated("metacritic"), failed("hltb", errorCode)]
						: sources.map(updated);
				}
			});

			queue.enqueue(["a", "b", "c"]);
			await queue.whenIdle();
			assert.deepEqual(
				refreshed.map(entry => entry.gameId),
				["a"]
			);
			assert.equal(queue.isPaused(), true);

			queue.enqueue(["d"]);
			await queue.whenIdle();
			assert.equal(refreshed.length, 1);
			assert.ok(
				warnings(logs).includes("paused: imported games ignored")
			);

			clock.now += PAUSE_MS - 1;
			queue.enqueue(["e"]);
			await queue.whenIdle();
			assert.equal(refreshed.length, 1);

			clock.now += 1;
			assert.equal(queue.isPaused(), false);
			queue.enqueue(["b"]);
			await queue.whenIdle();
			assert.deepEqual(
				refreshed.map(entry => entry.gameId),
				["a", "b"]
			);
		});
	}

	for (const errorCode of [
		"HLTB_TIMEOUT",
		"METACRITIC_PARSE_ERROR",
		"HLTB_REQUEST_ERROR",
		null
	]) {
		void it(`keeps going after a failure with code ${String(errorCode)}`, async () => {
			const { queue, refreshed } = buildQueue({
				refresh: async (game, sources) => {
					refreshed.push({ gameId: game.id, sources: [...sources] });
					return sources.map(source => failed(source, errorCode));
				}
			});

			queue.enqueue(["a", "b"]);
			await queue.whenIdle();

			assert.equal(refreshed.length, 2);
			assert.equal(queue.isPaused(), false);
		});
	}

	void it("swallows errors thrown while loading or refreshing a game and keeps processing", async () => {
		const { queue, refreshed, logs } = buildQueue({
			findCandidate: async gameId => {
				if (gameId === "broken-lookup") throw new Error("db down");
				if (gameId === "broken-string") throw "not an error";
				return candidateOf(gameId);
			},
			refresh: async (game, sources) => {
				if (game.id === "broken-refresh") throw new Error("boom");
				refreshed.push({ gameId: game.id, sources: [...sources] });
				return sources.map(updated);
			}
		});

		queue.enqueue([
			"broken-lookup",
			"broken-refresh",
			"broken-string",
			"ok"
		]);
		await queue.whenIdle();

		assert.deepEqual(
			refreshed.map(entry => entry.gameId),
			["ok"]
		);
		assert.equal(logs.filter(entry => entry.level === "error").length, 3);
		assert.equal(queue.size(), 0);
	});

	void it("never throws from enqueue, even when its dependencies do", async () => {
		const { queue, logs } = buildQueue({
			availableSources: () => {
				throw new Error("registry broken");
			}
		});

		assert.doesNotThrow(() => queue.enqueue(["a"]));
		await queue.whenIdle();
		assert.equal(logs.at(-1)?.level, "error");
	});

	void it("picks up games enqueued while it was finishing a previous batch", async () => {
		const { queue, refreshed } = buildQueue();

		queue.enqueue(["a"]);
		const idle = queue.whenIdle();
		queue.enqueue(["b"]);
		await idle;
		await queue.whenIdle();

		assert.deepEqual(
			refreshed.map(entry => entry.gameId),
			["a", "b"]
		);
	});
});
