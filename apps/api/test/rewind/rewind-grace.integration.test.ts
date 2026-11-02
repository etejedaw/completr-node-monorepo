import "./rewind-grace-today-env.setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	addRun,
	findRewindRow,
	generate,
	readRewind,
	regenerationOf,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

let platform: Platform;
let game: Game;

async function playerOf2026() {
	const player = await signUpOn("2025-01-15T00:00:00.000Z");
	await addRun(player, game, platform, { finishedAt: "2026-06-06" });
	return player;
}

useTestDatabase(async () => {
	platform = await createPlatform();
	game = await createGame({ title: "Hades" });
});

void describe("regenerating during the January grace (2027-01-03)", () => {
	void it("announces the grace and spends it before the normal regeneration", async () => {
		const player = await playerOf2026();

		const first = await generate(player, 2026).expect(201);
		assert.equal(first.body.data.ownerControls.graceEndsAt, "2027-01-07");
		assert.equal(first.body.data.ownerControls.regenerationsLeft, 1);

		const grace = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).expect(200);
		assert.equal(grace.body.data.ownerControls.graceEndsAt, null);
		assert.equal(grace.body.data.ownerControls.regenerationsLeft, 1);
		assert.equal(grace.body.data.ownerControls.canRegenerate, true);
		const afterGrace = await findRewindRow(player, 2026);
		assert.equal(afterGrace?.graceUsed, true);
		assert.equal(afterGrace?.regenerationsUsed, 0);

		const normal = await generate(
			player,
			2026,
			regenerationOf(grace.body.data.generatedAt)
		).expect(200);
		assert.equal(normal.body.data.ownerControls.regenerationsLeft, 0);
		assert.equal(normal.body.data.ownerControls.canRegenerate, false);

		const limit = await generate(
			player,
			2026,
			regenerationOf(normal.body.data.generatedAt)
		);
		assert.equal(limit.status, 409);
		assert.equal(limit.body.type, "REWIND_REGENERATION_LIMIT");
	});

	void it("still lets an owner who spent the normal regeneration use the grace", async () => {
		const player = await playerOf2026();
		const stored = await storeRewind(player, 2026, {
			regenerationsUsed: 1
		});

		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.canRegenerate, true);
		assert.equal(own.body.data.ownerControls.regenerationsLeft, 0);

		await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		).expect(200);
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.graceUsed, true);
		assert.equal(row?.regenerationsUsed, 1);
	});

	void it("lets only one of two simultaneous grace regenerations win", async () => {
		const player = await playerOf2026();
		const stored = await storeRewind(player, 2026, {
			regenerationsUsed: 1
		});
		const body = regenerationOf(stored.generatedAt.toISOString());

		const responses = await Promise.all([
			generate(player, 2026, body),
			generate(player, 2026, body),
			generate(player, 2026, body)
		]);

		assert.deepEqual(
			responses.map(response => response.status).sort(),
			[200, 409, 409]
		);
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.graceUsed, true);
		assert.equal(row?.regenerationsUsed, 1);
	});
});
