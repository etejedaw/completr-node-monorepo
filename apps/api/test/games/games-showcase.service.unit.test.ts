import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sampleShowcaseGames } from "../../src/games/services/games-showcase.service";

const POOL = Array.from({ length: 10 }, (_, index) => `game-${index}`);

function sequence(...values: number[]) {
	let call = 0;
	return () => values[call++ % values.length]!;
}

void describe("sampleShowcaseGames", () => {
	void it("returns the requested amount of distinct games from the pool", () => {
		const sample = sampleShowcaseGames(POOL, 4);

		assert.equal(sample.length, 4);
		assert.equal(new Set(sample).size, 4);
		assert.ok(sample.every(game => POOL.includes(game)));
	});

	void it("keeps the pool order when the random source always returns 0", () => {
		assert.deepEqual(
			sampleShowcaseGames(POOL, 3, () => 0),
			["game-0", "game-1", "game-2"]
		);
	});

	void it("can pick games from the end of the pool", () => {
		assert.deepEqual(
			sampleShowcaseGames(POOL, 2, () => 0.9999),
			["game-9", "game-0"]
		);
	});

	void it("varies the sample with the random source", () => {
		const first = sampleShowcaseGames(POOL, 3, sequence(0));
		const second = sampleShowcaseGames(POOL, 3, sequence(0.5, 0.1, 0.9));

		assert.notDeepEqual(first, second);
	});

	void it("returns the whole pool when it is smaller than the requested size", () => {
		const sample = sampleShowcaseGames(POOL.slice(0, 3), 21);

		assert.deepEqual([...sample].sort(), ["game-0", "game-1", "game-2"]);
	});

	void it("does not mutate the pool", () => {
		const pool = [...POOL];
		sampleShowcaseGames(pool, 5, () => 0.7);

		assert.deepEqual(pool, POOL);
	});
});
