import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRequestPacer } from "../../../src/games/utils/create-request-pacer.util";

function fakeClock(start = 1_000) {
	let current = start;
	const sleeps: number[] = [];
	return {
		sleeps,
		advance(milliseconds: number) {
			current += milliseconds;
		},
		clock: {
			now: () => current,
			async sleep(milliseconds: number, signal?: AbortSignal) {
				signal?.throwIfAborted();
				sleeps.push(milliseconds);
				current += milliseconds;
			}
		}
	};
}

void describe("createRequestPacer", () => {
	void it("lets the first request through without waiting", async () => {
		const { clock, sleeps } = fakeClock();
		const pacer = createRequestPacer(250, clock);

		await pacer.waitForTurn();

		assert.deepEqual(sleeps, []);
	});

	void it("spaces requests that arrive back to back by the interval", async () => {
		const { clock, sleeps } = fakeClock();
		const pacer = createRequestPacer(250, clock);

		await pacer.waitForTurn();
		await pacer.waitForTurn();
		await pacer.waitForTurn();

		assert.deepEqual(sleeps, [250, 250]);
	});

	void it("gives concurrent callers consecutive turns", async () => {
		const sleeps: number[] = [];
		const pacer = createRequestPacer(250, {
			now: () => 5_000,
			async sleep(milliseconds) {
				sleeps.push(milliseconds);
			}
		});

		await Promise.all([
			pacer.waitForTurn(),
			pacer.waitForTurn(),
			pacer.waitForTurn(),
			pacer.waitForTurn()
		]);

		assert.deepEqual(sleeps, [250, 500, 750]);
	});

	void it("does not wait when the interval already passed", async () => {
		const { clock, sleeps, advance } = fakeClock();
		const pacer = createRequestPacer(250, clock);

		await pacer.waitForTurn();
		advance(400);
		await pacer.waitForTurn();
		advance(100);
		await pacer.waitForTurn();

		assert.deepEqual(sleeps, [150]);
	});

	void it("rejects at once for a signal that is already aborted", async () => {
		const { clock, sleeps } = fakeClock();
		const pacer = createRequestPacer(250, clock);
		const controller = new AbortController();
		controller.abort();

		await assert.rejects(pacer.waitForTurn(controller.signal));
		assert.deepEqual(sleeps, []);
	});

	void it("stops waiting with the real clock when the signal aborts", async () => {
		const pacer = createRequestPacer(60_000);
		await pacer.waitForTurn();
		const controller = new AbortController();
		const startedAt = Date.now();

		const waiting = pacer.waitForTurn(controller.signal);
		setTimeout(() => controller.abort(), 20);

		await assert.rejects(waiting, { name: "AbortError" });
		assert.ok(Date.now() - startedAt < 1_000);
	});
});
