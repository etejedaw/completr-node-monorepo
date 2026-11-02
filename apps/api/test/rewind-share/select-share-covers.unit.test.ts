import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectShareCovers } from "../../src/rewind-share/utils/select-share-covers.util";
import { buildRewind, finishedGame } from "./rewind.fixture";

const SHARED_COVER = "https://img.test/re4.jpg";

void describe("selectShareCovers", () => {
	void it("skips a second game that reuses the same cover image", () => {
		const rewind = buildRewind({
			finishedGames: [
				finishedGame({
					gameId: "re4",
					code: "re4",
					coverUrl: SHARED_COVER
				}),
				finishedGame({
					gameId: "re4-remake",
					code: "re4-remake",
					coverUrl: SHARED_COVER
				}),
				finishedGame({
					gameId: "metro",
					code: "metro",
					coverUrl: "https://img.test/metro.jpg"
				})
			]
		});
		rewind.highlights.topRated = null;

		assert.deepEqual(
			selectShareCovers(rewind, 4).map(game => game.code),
			["metro", "re4-remake"]
		);
	});

	void it("puts games without cover art after the ones that have it", () => {
		const rewind = buildRewind({
			finishedGames: [
				finishedGame({
					gameId: "with-art",
					code: "with-art",
					coverUrl: "https://img.test/art.jpg"
				}),
				finishedGame({
					gameId: "no-art",
					code: "no-art",
					coverUrl: null
				})
			]
		});
		rewind.highlights.topRated = null;

		assert.deepEqual(
			selectShareCovers(rewind, 4).map(game => game.code),
			["with-art", "no-art"]
		);
	});
});
