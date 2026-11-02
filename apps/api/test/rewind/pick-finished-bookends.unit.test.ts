import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindFinishedGame } from "../../src/rewind/rewind.interface";
import { pickFinishedBookends } from "../../src/rewind/utils/pick-finished-bookends.util";

function game(code: string, finishedAt: string): RewindFinishedGame {
	return {
		gameId: `id-${code}`,
		code,
		title: code,
		coverUrl: null,
		backgroundUrl: null,
		finishedAt,
		platformAbbreviation: null
	};
}

void describe("pickFinishedBookends", () => {
	void it("is null on both ends without finished games", () => {
		assert.deepEqual(pickFinishedBookends([]), {
			firstFinished: null,
			lastFinished: null
		});
	});

	void it("repeats the only game on both ends", () => {
		const only = game("solo", "2025-04-04");

		assert.deepEqual(pickFinishedBookends([only]), {
			firstFinished: only,
			lastFinished: only
		});
	});

	void it("takes the first and last games of the chronological list", () => {
		const games = [
			game("first", "2025-01-02"),
			game("middle", "2025-06-06"),
			game("last", "2025-12-31")
		];

		const { firstFinished, lastFinished } = pickFinishedBookends(games);

		assert.equal(firstFinished?.code, "first");
		assert.equal(lastFinished?.code, "last");
	});
});
