import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	leadTile,
	supportingTiles
} from "../../src/rewind-share/templates/stat-tiles.template";
import { emptyTotals } from "./rewind.fixture";

void describe("leadTile", () => {
	void it("leads with finished games and uses the singular for one", () => {
		assert.deepEqual(
			[
				leadTile(emptyTotals({ finished: 18 })),
				leadTile(emptyTotals({ finished: 1 }))
			].map(tile => `${tile.value} ${tile.label}`),
			["18 games finished", "1 game finished"]
		);
	});

	void it("leads with started games when nothing was finished", () => {
		const tile = leadTile(emptyTotals({ started: 6 }));
		assert.equal(`${tile.value} ${tile.label}`, "6 games started");
	});
});

void describe("supportingTiles", () => {
	void it("keeps the order hours, finish rate, platinums and stops at the limit", () => {
		const tiles = supportingTiles(
			emptyTotals({
				finished: 18,
				abandoned: 4,
				hoursPlayed: 212.5,
				platinums: 3,
				finishRate: 82,
				averageRating: 4.3,
				genresPlayed: 7
			}),
			3
		);
		assert.deepEqual(
			tiles.map(tile => `${tile.value} ${tile.label}`),
			["213 hours played", "82% finish rate", "3 platinums"]
		);
	});

	void it("skips zero and hidden values and shows a 0% finish rate", () => {
		const tiles = supportingTiles(
			emptyTotals({ abandoned: 4, started: 6, finishRate: 0 }),
			3
		);
		assert.deepEqual(
			tiles.map(tile => `${tile.value} ${tile.label}`),
			["0% finish rate", "4 left behind"]
		);
	});

	void it("returns nothing for a year with nothing to show", () => {
		assert.deepEqual(supportingTiles(emptyTotals(), 3), []);
	});
});
