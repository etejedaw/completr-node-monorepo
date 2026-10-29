import "./rewind-after-grace-today-env.setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

useTestDatabase();

void describe("after the January grace (2027-01-08)", () => {
	void it("no longer offers the grace and keeps the spent regeneration spent", async () => {
		const [platform, game] = await Promise.all([
			createPlatform(),
			createGame({ title: "Hades" })
		]);
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, game, platform, { finishedAt: "2026-06-06" });
		const stored = await storeRewind(player, 2026, {
			regenerationsUsed: 1
		});

		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.graceEndsAt, null);
		assert.equal(own.body.data.ownerControls.canRegenerate, false);

		const response = await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		);
		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_REGENERATION_LIMIT");
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.graceUsed, false);
		assert.equal(
			row?.generatedAt.toISOString(),
			stored.generatedAt.toISOString()
		);
	});
});
