import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	leadTile,
	supportingTiles
} from "../../src/rewind-share/templates/stat-tiles.template";
import { shareCopy } from "../../src/rewind-share/utils/share-copy.util";
import { emptyTotals } from "./rewind.fixture";

const ENGLISH = shareCopy("en");
const SPANISH = shareCopy("es");

void describe("leadTile", () => {
	void it("leads with finished games and uses the singular for one", () => {
		assert.deepEqual(
			[
				leadTile(emptyTotals({ finished: 18 }), ENGLISH),
				leadTile(emptyTotals({ finished: 1 }), ENGLISH)
			].map(tile => `${tile.value} ${tile.label}`),
			["18 games finished", "1 game finished"]
		);
	});

	void it("leads with started games when nothing was finished", () => {
		const tile = leadTile(emptyTotals({ started: 6 }), ENGLISH);
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
			ENGLISH,
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
			ENGLISH,
			3
		);
		assert.deepEqual(
			tiles.map(tile => `${tile.value} ${tile.label}`),
			["0% finish rate", "4 left behind"]
		);
	});

	void it("returns nothing for a year with nothing to show", () => {
		assert.deepEqual(supportingTiles(emptyTotals(), ENGLISH, 3), []);
	});
});

void describe("stat tiles in Spanish", () => {
	void it("translates the lead tile with singular and plural", () => {
		assert.deepEqual(
			[
				leadTile(emptyTotals({ finished: 18 }), SPANISH),
				leadTile(emptyTotals({ finished: 1 }), SPANISH),
				leadTile(emptyTotals({ started: 1 }), SPANISH)
			].map(tile => `${tile.value} ${tile.label}`),
			["18 juegos terminados", "1 juego terminado", "1 juego empezado"]
		);
	});

	void it("translates the supporting tiles and uses the Spanish decimal comma", () => {
		const tiles = supportingTiles(
			emptyTotals({
				finished: 2,
				hoursPlayed: 12.5,
				finishRate: 50,
				platinums: 1,
				abandoned: 2,
				averageRating: 4.5,
				genresPlayed: 1
			}),
			SPANISH,
			6
		);
		assert.deepEqual(
			tiles.map(tile => `${tile.value} ${tile.label}`),
			[
				"12,5 horas jugadas",
				"50% tasa de finalización",
				"1 platino",
				"2 abandonados",
				"4,5 nota media",
				"1 género"
			]
		);
	});
});
