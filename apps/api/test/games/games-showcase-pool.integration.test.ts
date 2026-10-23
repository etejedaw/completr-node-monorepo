import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { GamePopularity } from "../../src/game-popularity/game-popularity.model";
import { Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";

const SHOWCASE_SIZE = 21;
const SHOWCASE_POOL_SIZE = 80;
const OUTSIDE_THE_POOL = 5;
const BACKGROUND_URL = "https://img.completr.test/background.jpg";

function poolTitle(rank: number) {
	return `Pool ${String(rank).padStart(3, "0")}`;
}

useTestDatabase(async () => {
	for (let rank = 1; rank <= SHOWCASE_POOL_SIZE + OUTSIDE_THE_POOL; rank++) {
		const game = await Game.create({
			title: poolTitle(rank),
			code: `pool-${rank}`,
			backgroundUrl: BACKGROUND_URL
		});
		await GamePopularity.create({ gameId: game.id, score: 1000 - rank });
	}
});

void describe("GET /games/showcase sampling pool", () => {
	void it("samples only from the 80 most popular games, down to the last of them", async () => {
		const random = mock.method(Math, "random", () => 0.9999);
		let response;
		try {
			response = await api().get("/games/showcase");
		} finally {
			random.mock.restore();
		}

		assert.equal(response.status, 200);
		const titles: string[] = response.body.data.games.map(
			(game: { title: string }) => game.title
		);
		assert.equal(titles.length, SHOWCASE_SIZE);
		assert.equal(new Set(titles).size, SHOWCASE_SIZE);
		assert.ok(titles.includes(poolTitle(SHOWCASE_POOL_SIZE)));
		for (
			let rank = SHOWCASE_POOL_SIZE + 1;
			rank <= SHOWCASE_POOL_SIZE + OUTSIDE_THE_POOL;
			rank++
		) {
			assert.equal(titles.includes(poolTitle(rank)), false);
		}
	});
});
