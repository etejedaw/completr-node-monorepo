import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGameScore,
	createScoreSource
} from "../helpers/factories.helper";

const BACKGROUND_URL = "https://img.completr.test/background.jpg";

useTestDatabase(async () => {
	await createScoreSource({
		code: "metacritic-t",
		scale: 100,
		priority: 100
	});
	const scoredOnly = await Game.create({
		title: "Scored Only",
		code: "scored-only",
		backgroundUrl: BACKGROUND_URL
	});
	await Game.create({
		title: "Plain Game",
		code: "plain-game",
		backgroundUrl: BACKGROUND_URL
	});
	await createGameScore(scoredOnly.id, "metacritic-t", 90);
});

void describe("GET /games/showcase without rated games", () => {
	void it("lists the games with null ratios when none has score and duration", async () => {
		const response = await api().get("/games/showcase");

		assert.equal(response.status, 200);
		const games = [...response.body.data.games].sort(
			(a: { title: string }, b: { title: string }) =>
				a.title.localeCompare(b.title)
		);
		assert.deepEqual(
			games.map(game => [game.title, game.score, game.ratio]),
			[
				["Plain Game", null, null],
				["Scored Only", 4.5, null]
			]
		);
		assert.equal("featured" in response.body.data, false);
	});
});
