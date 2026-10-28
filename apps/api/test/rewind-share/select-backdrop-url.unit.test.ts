import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectBackdropUrl } from "../../src/rewind-share/utils/select-backdrop-url.util";
import { buildRewind, emptyRewind, finishedGame } from "./rewind.fixture";

void describe("selectBackdropUrl", () => {
	void it("prefers the art of the top rated game", () => {
		const rewind = buildRewind();
		rewind.highlights.topRated = {
			...rewind.highlights.topRated!,
			backgroundUrl: "https://art.test/top.jpg"
		};
		rewind.highlights.firstFinished = finishedGame({
			backgroundUrl: "https://art.test/first.jpg"
		});

		assert.equal(selectBackdropUrl(rewind), "https://art.test/top.jpg");
	});

	void it("falls back to the first finished game and then to any finished game with art", () => {
		const rewind = buildRewind();
		rewind.highlights.topRated = null;
		rewind.highlights.firstFinished = finishedGame({
			backgroundUrl: "https://art.test/first.jpg"
		});
		assert.equal(selectBackdropUrl(rewind), "https://art.test/first.jpg");

		rewind.highlights.firstFinished = finishedGame();
		rewind.finishedGames = [
			finishedGame({ gameId: "no-art" }),
			finishedGame({
				gameId: "late",
				backgroundUrl: "https://art.test/late.jpg"
			})
		];
		assert.equal(selectBackdropUrl(rewind), "https://art.test/late.jpg");
	});

	void it("returns null when no game has art", () => {
		assert.equal(selectBackdropUrl(emptyRewind()), null);
		assert.equal(selectBackdropUrl(buildRewind()), null);
	});
});
