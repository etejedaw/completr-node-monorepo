import "./rewind-after-grace-today-env.setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	addRun,
	findRewindRow,
	generate,
	openRewindEdition2026,
	readRewind,
	regenerationOf,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

useTestDatabase(async () => {
	await openRewindEdition2026();
});

void describe("after the grace of the edition (2027-01-08)", () => {
	void it("no longer offers the grace and answers the limit without rolls", async () => {
		const [platform, game] = await Promise.all([
			createPlatform(),
			createGame({ title: "Hades" })
		]);
		const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
		await addRun(player, game, platform, { finishedAt: "2026-06-06" });
		const stored = await storeRewind(player, 2026, {
			premiumAccessKind: "premium",
			regenerationsLeft: 0
		});

		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.graceEndsAt, null);
		assert.equal(own.body.data.ownerControls.canRegenerate, false);
		assert.equal(own.body.data.ownerControls.periodOpen, true);

		const response = await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		);
		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_REGENERATION_LIMIT");
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.graceUsed, false);
		assert.equal(row?.regenerationsLeft, 0);
		assert.equal(
			row?.generatedAt.toISOString(),
			stored.generatedAt.toISOString()
		);
	});
});
