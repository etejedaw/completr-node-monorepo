import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	addRun,
	AI_RECAP,
	FIRST_GENERATION,
	generate,
	mockAiRecap,
	mockPremiumStats,
	PREMIUM_STATS,
	readRewind,
	readRewindYears,
	regenerationOf,
	requestAiRecap,
	signUpOn
} from "./rewind-generation.helper";

let platform: Platform;
let game: Game;

useTestDatabase(async () => {
	platform = await createPlatform();
	game = await createGame({ title: "Hades" });
});

afterEach(async () => {
	mock.restoreAll();
	await PremiumGrant.destroy({ where: { userId: null } });
});

async function playerWithYear() {
	const player = await signUpOn("2025-01-15T00:00:00.000Z");
	await addRun(player, game, platform, {
		startedAt: "2026-02-01",
		finishedAt: "2026-03-10",
		realDuration: 20
	});
	return player;
}

function futureDate() {
	return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

void describe("Rewind premium access", () => {
	void it("generates and regenerates premium content through the global gift without changing regeneration limits", async () => {
		const player = await playerWithYear();
		await PremiumGrant.create({
			userId: null,
			feature: "rewind.premium",
			expiresAt: futureDate()
		});
		const aiMock = mockAiRecap();
		mockPremiumStats();

		const first = await generate(player, 2026, {
			...FIRST_GENERATION,
			includePrivateRuns: true,
			includeNotes: true
		}).expect(201);

		assert.deepEqual(first.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(first.body.data.premiumStats, PREMIUM_STATS);
		assert.deepEqual(first.body.data.premiumAccess, {
			allowed: true,
			source: "feature-grant",
			expiresAt: first.body.data.premiumAccess.expiresAt
		});
		assert.equal(first.body.data.ownerControls.includesPrivateRuns, true);
		assert.equal(first.body.data.ownerControls.includesNotes, true);

		const years = await readRewindYears(
			player.user.username,
			player.authorization
		).expect(200);
		assert.equal(years.body.data.premiumAccess.source, "feature-grant");

		const second = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).expect(200);
		assert.equal(second.body.data.ownerControls.regenerationsLeft, 0);
		assert.equal(aiMock.mock.callCount(), 2);

		const third = await generate(
			player,
			2026,
			regenerationOf(second.body.data.generatedAt)
		);
		assert.equal(third.status, 409);
		assert.equal(third.body.type, "REWIND_REGENERATION_LIMIT");
		assert.equal(aiMock.mock.callCount(), 2);
	});

	void it("lets a feature grant add a recap to an existing base Rewind", async () => {
		const player = await playerWithYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();
		await generate(player, 2026).expect(201);

		const denied = await requestAiRecap(player, 2026);
		assert.equal(denied.status, 402);
		assert.equal(denied.body.type, "REWIND_AI_RECAP_PREMIUM_REQUIRED");

		await PremiumGrant.create({
			userId: player.user.id,
			feature: "rewind.premium",
			expiresAt: futureDate()
		});
		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.aiRecapState, "available");
		assert.equal(own.body.data.premiumAccess.source, "feature-grant");

		const added = await requestAiRecap(player, 2026).expect(200);
		assert.deepEqual(added.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(added.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(added.body.data.ownerControls.regenerationsLeft, 1);
		assert.equal(aiMock.mock.callCount(), 1);
	});

	void it("distinguishes a full temporary grant from a Rewind feature gift", async () => {
		const player = await playerWithYear();
		const expiresAt = futureDate();
		await PremiumGrant.create({
			userId: player.user.id,
			feature: "*",
			expiresAt
		});
		mockPremiumStats();
		mockAiRecap();

		const response = await generate(player, 2026).expect(201);

		assert.deepEqual(response.body.data.premiumAccess, {
			allowed: true,
			source: "full-grant",
			expiresAt: expiresAt.toISOString()
		});
		assert.equal(response.body.data.ownerControls.aiRecapState, "ready");
	});

	void it("keeps stored premium content after expiration while new free generations stay basic", async () => {
		const giftedPlayer = await playerWithYear();
		const grant = await PremiumGrant.create({
			userId: null,
			feature: "rewind.premium",
			expiresAt: futureDate()
		});
		const aiMock = mockAiRecap();
		const statsMock = mockPremiumStats();
		const generated = await generate(giftedPlayer, 2026).expect(201);
		await grant.update({ expiresAt: new Date(Date.now() - 1000) });

		const visitor = await readRewind(
			giftedPlayer.user.username,
			2026
		).expect(200);
		assert.deepEqual(visitor.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(visitor.body.data.premiumStats, PREMIUM_STATS);
		assert.deepEqual(visitor.body.data.premiumAccess, {
			allowed: false,
			source: null,
			expiresAt: null
		});

		const denied = await requestAiRecap(giftedPlayer, 2026);
		assert.equal(denied.status, 402);
		const regenerated = await generate(
			giftedPlayer,
			2026,
			regenerationOf(generated.body.data.generatedAt)
		).expect(200);
		assert.deepEqual(regenerated.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(regenerated.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(aiMock.mock.callCount(), 1);
		assert.equal(statsMock.mock.callCount(), 1);

		const freePlayer = await playerWithYear();
		const basic = await generate(freePlayer, 2026).expect(201);
		assert.equal(basic.body.data.aiRecap, null);
		assert.equal(basic.body.data.premiumStats, null);
		assert.equal(basic.body.data.ownerControls.aiRecapState, "unavailable");
		assert.equal(aiMock.mock.callCount(), 1);
		assert.equal(statsMock.mock.callCount(), 1);
	});
});
