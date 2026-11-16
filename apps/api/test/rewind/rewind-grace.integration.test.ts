import "./rewind-grace-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	findRewindRow,
	generate,
	mockAiRecap,
	mockPremiumStats,
	openRewindEdition2026,
	readRewind,
	regenerateStored,
	regenerationOf,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

let platform: Platform;
let game: Game;

async function playerOf2026(role: Account["user"]["role"] = "premium") {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
	await addRun(player, game, platform, { finishedAt: "2026-06-06" });
	return player;
}

function storePremiumRewind(player: Account, regenerationsLeft: number) {
	return storeRewind(player, 2026, {
		premiumAccessKind: "premium",
		regenerationsLeft
	});
}

useTestDatabase(async () => {
	platform = await createPlatform();
	game = await createGame({ title: "Hades" });
	await openRewindEdition2026({ premiumRegenerations: 1 });
});

afterEach(() => {
	mock.restoreAll();
});

void describe("regenerating during the grace of the edition (2027-01-03)", () => {
	void it("spends the grace on the first AI generation and the rolls after it", async () => {
		const player = await playerOf2026();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		assert.equal(first.body.data.ownerControls.graceEndsAt, null);
		assert.equal(first.body.data.ownerControls.regenerationsLeft, 1);
		assert.equal(first.body.data.ownerControls.canRegenerate, true);
		const afterFirst = await findRewindRow(player, 2026);
		assert.equal(afterFirst?.graceUsed, true);
		assert.equal(afterFirst?.regenerationsLeft, 1);

		const normal = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
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
		assert.equal(aiMock.mock.callCount(), 2);
	});

	void it("announces the grace to an owner without rolls and spends it before any roll", async () => {
		const player = await playerOf2026();
		const stored = await storePremiumRewind(player, 0);
		mockPremiumStats();
		mockAiRecap();

		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.graceEndsAt, "2027-01-07");
		assert.equal(own.body.data.ownerControls.canRegenerate, true);
		assert.equal(own.body.data.ownerControls.regenerationsLeft, 0);

		await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		).expect(200);
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.graceUsed, true);
		assert.equal(row?.regenerationsLeft, 0);
	});

	void it("lets only one of three simultaneous grace regenerations win", async () => {
		const player = await playerOf2026();
		const stored = await storePremiumRewind(player, 1);
		mockPremiumStats();
		mockAiRecap();
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
		assert.equal(row?.regenerationsLeft, 1);
	});

	void it("gives the grace back when the AI fails", async () => {
		const player = await playerOf2026();
		const stored = await storePremiumRewind(player, 0);
		mockPremiumStats();
		const aiMock = mockAiRecap(() => Promise.reject(new Error("timeout")));

		const failed = await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		).expect(200);
		assert.equal(failed.body.data.ownerControls.aiRecapState, "failed");
		assert.equal(failed.body.data.ownerControls.graceEndsAt, "2027-01-07");
		assert.equal((await findRewindRow(player, 2026))?.graceUsed, false);

		aiMock.mock.mockImplementation(() =>
			Promise.reject(new Error("still down"))
		);
		const retryFailure = await regenerateStored(player, 2026);
		assert.equal(retryFailure.status, 200);
		assert.equal(
			retryFailure.body.data.ownerControls.aiRecapState,
			"failed"
		);
		assert.equal((await findRewindRow(player, 2026))?.graceUsed, false);
	});

	void it("offers no grace without access to the AI", async () => {
		const player = await playerOf2026("user");
		const stored = await storeRewind(player, 2026);

		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.graceEndsAt, null);
		assert.equal(own.body.data.ownerControls.canRegenerate, false);

		const denied = await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		);
		assert.equal(denied.status, 402);
		assert.equal((await findRewindRow(player, 2026))?.graceUsed, false);
	});

	void it("gives no grace to a previous year", async () => {
		const player = await playerOf2026();
		await addRun(player, game, platform, { finishedAt: "2025-06-06" });
		const stored = await storeRewind(player, 2025, {
			premiumAccessKind: "premium",
			regenerationsLeft: 0
		});

		const own = await readRewind(
			player.user.username,
			2025,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.graceEndsAt, null);
		assert.equal(own.body.data.ownerControls.canRegenerate, false);

		const limit = await generate(
			player,
			2025,
			regenerationOf(stored.generatedAt.toISOString())
		);
		assert.equal(limit.status, 409);
		assert.equal(limit.body.type, "REWIND_REGENERATION_LIMIT");
	});
});
