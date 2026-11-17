import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { platinumToRewindPlatinumGame } from "../../src/rewind/mappers/platinum-to-rewind-platinum-game.mapper";

const HADES = {
	id: "game-hades",
	code: "hades",
	title: "Hades",
	coverUrl: "https://img.test/hades.jpg",
	backgroundUrl: null,
	isDlc: false
};

function platinumRow(fields: Partial<GamePlatinum>): GamePlatinum {
	return {
		id: "platinum-1",
		userId: "user-1",
		gameId: HADES.id,
		backlogId: "run-1",
		platformId: "platform-1",
		platinumedAt: "2026-03-04",
		notes: "private note",
		Game: HADES,
		Platform: {
			id: "platform-1",
			name: "PlayStation 5",
			abbreviation: "PS5"
		},
		...fields
	} as GamePlatinum;
}

void describe("platinumToRewindPlatinumGame", () => {
	void it("keeps the game reference, the date, the platform abbreviation and the run, never the notes", () => {
		assert.deepEqual(platinumToRewindPlatinumGame(platinumRow({})), {
			gameId: "game-hades",
			code: "hades",
			title: "Hades",
			coverUrl: "https://img.test/hades.jpg",
			backgroundUrl: null,
			platinumedAt: "2026-03-04",
			platformAbbreviation: "PS5",
			backlogId: "run-1"
		});
	});

	void it("leaves the platform empty when the platinum has none", () => {
		assert.equal(
			platinumToRewindPlatinumGame(platinumRow({ Platform: null }))
				?.platformAbbreviation,
			null
		);
	});

	void it("leaves the run empty for a platinum of the game without run", () => {
		assert.equal(
			platinumToRewindPlatinumGame(platinumRow({ backlogId: null }))
				?.backlogId,
			null
		);
	});

	void it("drops a row without its game or without a date", () => {
		assert.equal(
			platinumToRewindPlatinumGame(platinumRow({ Game: undefined })),
			null
		);
		assert.equal(
			platinumToRewindPlatinumGame(platinumRow({ platinumedAt: null })),
			null
		);
	});
});
