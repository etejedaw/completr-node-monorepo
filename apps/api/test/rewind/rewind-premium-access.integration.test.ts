import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { User } from "../../src/users/user.model";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	AI_RECAP,
	findRewindRow,
	FIRST_GENERATION,
	generate,
	mockAiRecap,
	mockPremiumStats,
	PREMIUM_STATS,
	readRewind,
	readRewindYears,
	regenerationOf,
	requestAiRecap,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

let platform: Platform;
let game: Game;

useTestDatabase(async () => {
	platform = await createPlatform();
	game = await createGame({ title: "Hades" });
});

afterEach(() => {
	mock.restoreAll();
});

async function playerWithYear(role: Account["user"]["role"] = "user") {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
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

function grantRewindGift(player: Account, expiresAt = futureDate()) {
	return PremiumGrant.create({
		userId: player.user.id,
		feature: "rewind.premium",
		expiresAt
	});
}

async function visitorViews(owner: Account) {
	const stranger = await signUpOn("2025-01-15T00:00:00.000Z");
	return Promise.all(
		[undefined, stranger.authorization].map(async authorization => ({
			detail: await readRewind(
				owner.user.username,
				2026,
				authorization
			).expect(200),
			years: await readRewindYears(
				owner.user.username,
				authorization
			).expect(200)
		}))
	);
}

void describe("Rewind premium access", () => {
	void it("labels content generated with a Rewind feature grant as a gift without changing regeneration limits", async () => {
		const player = await playerWithYear();
		const grant = await grantRewindGift(player);
		const aiMock = mockAiRecap();
		mockPremiumStats();

		const first = await generate(player, 2026, {
			...FIRST_GENERATION,
			includePrivateRuns: true,
			includeNotes: true
		}).expect(201);

		assert.deepEqual(first.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(first.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(first.body.data.premiumAccessKind, "gift");
		assert.deepEqual(first.body.data.premiumAccess, {
			allowed: true,
			source: "feature-grant",
			expiresAt: grant.expiresAt?.toISOString()
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
		assert.equal(second.body.data.premiumAccessKind, "gift");
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

	void it("lets a feature grant add a recap to an existing base Rewind and labels it as a gift", async () => {
		const player = await playerWithYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();
		const base = await generate(player, 2026).expect(201);
		assert.equal(base.body.data.premiumAccessKind, null);

		const denied = await requestAiRecap(player, 2026);
		assert.equal(denied.status, 402);
		assert.equal(denied.body.type, "REWIND_AI_RECAP_PREMIUM_REQUIRED");

		await grantRewindGift(player);
		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.aiRecapState, "available");
		assert.equal(own.body.data.premiumAccess.source, "feature-grant");
		assert.equal(own.body.data.premiumAccessKind, null);

		const added = await requestAiRecap(player, 2026).expect(200);
		assert.deepEqual(added.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(added.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(added.body.data.premiumAccessKind, "gift");
		assert.equal(added.body.data.ownerControls.regenerationsLeft, 1);
		assert.equal(aiMock.mock.callCount(), 1);

		const repeated = await requestAiRecap(player, 2026);
		assert.equal(repeated.status, 409);
		assert.equal(aiMock.mock.callCount(), 1);
	});

	void it("labels content generated with a full temporary grant as premium", async () => {
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
		assert.equal(response.body.data.premiumAccessKind, "premium");
		assert.equal(response.body.data.ownerControls.aiRecapState, "ready");
	});

	void it("labels content generated with a premium role as premium", async () => {
		const player = await playerWithYear("premium");
		mockPremiumStats();
		mockAiRecap();

		const response = await generate(player, 2026).expect(201);

		assert.deepEqual(response.body.data.premiumAccess, {
			allowed: true,
			source: "role",
			expiresAt: null
		});
		assert.equal(response.body.data.premiumAccessKind, "premium");
		assert.equal(
			(await findRewindRow(player, 2026))?.premiumAccessKind,
			"premium"
		);
	});

	void it("relabels the Rewind with the access used by the latest premium regeneration", async () => {
		const player = await playerWithYear();
		await grantRewindGift(player);
		mockPremiumStats();
		mockAiRecap();
		const gifted = await generate(player, 2026).expect(201);
		assert.equal(gifted.body.data.premiumAccessKind, "gift");

		await User.update(
			{ role: "premium" },
			{ where: { id: player.user.id } }
		);
		const upgraded = await generate(
			player,
			2026,
			regenerationOf(gifted.body.data.generatedAt)
		).expect(200);

		assert.equal(upgraded.body.data.premiumAccessKind, "premium");
		assert.equal(upgraded.body.data.premiumAccess.source, "role");
	});

	void it("keeps the gift label on stored content after the gift expires while new free generations stay basic", async () => {
		const giftedPlayer = await playerWithYear();
		const grant = await grantRewindGift(giftedPlayer);
		const aiMock = mockAiRecap();
		const statsMock = mockPremiumStats();
		const generated = await generate(giftedPlayer, 2026).expect(201);
		await grant.update({ expiresAt: new Date(Date.now() - 1000) });

		for (const { detail } of await visitorViews(giftedPlayer)) {
			assert.deepEqual(detail.body.data.aiRecap, AI_RECAP);
			assert.deepEqual(detail.body.data.premiumStats, PREMIUM_STATS);
			assert.equal(detail.body.data.premiumAccessKind, "gift");
			assert.equal(detail.body.data.premiumAccess, null);
		}

		const own = await readRewind(
			giftedPlayer.user.username,
			2026,
			giftedPlayer.authorization
		).expect(200);
		assert.equal(own.body.data.premiumAccessKind, "gift");
		assert.deepEqual(own.body.data.premiumAccess, {
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
		assert.equal(regenerated.body.data.premiumAccessKind, "gift");
		assert.equal(aiMock.mock.callCount(), 1);
		assert.equal(statsMock.mock.callCount(), 1);

		const freePlayer = await playerWithYear();
		const basic = await generate(freePlayer, 2026).expect(201);
		assert.equal(basic.body.data.aiRecap, null);
		assert.equal(basic.body.data.premiumStats, null);
		assert.equal(basic.body.data.premiumAccessKind, null);
		assert.equal(basic.body.data.ownerControls.aiRecapState, "unavailable");
		assert.equal(aiMock.mock.callCount(), 1);
		assert.equal(statsMock.mock.callCount(), 1);
	});

	void it("clears the label when a free regeneration leaves no premium content", async () => {
		const player = await playerWithYear();
		await storeRewind(player, 2026, {
			premiumAccessKind: "gift",
			aiRecapStatus: "failed"
		});

		const regenerated = await generate(
			player,
			2026,
			regenerationOf("2026-12-02T10:00:00.000Z")
		).expect(200);

		assert.equal(regenerated.body.data.premiumAccessKind, null);
		assert.equal(regenerated.body.data.aiRecap, null);
		assert.equal(regenerated.body.data.premiumStats, null);
		assert.equal(
			(await findRewindRow(player, 2026))?.premiumAccessKind,
			null
		);
	});

	void it("leaves existing Rewinds without a label until premium content is generated again", async () => {
		const player = await playerWithYear();
		await storeRewind(player, 2026, {
			aiRecap: AI_RECAP,
			aiRecapStatus: "ready",
			premiumStats: PREMIUM_STATS
		});

		for (const { detail } of await visitorViews(player)) {
			assert.deepEqual(detail.body.data.aiRecap, AI_RECAP);
			assert.equal(detail.body.data.premiumAccessKind, null);
		}
	});

	void it("labels the premium stats kept from a failed recap and leaves the label empty when nothing was stored", async () => {
		const player = await playerWithYear("premium");
		mockPremiumStats();
		mockAiRecap(() => Promise.reject(new Error("model unavailable")));

		const partial = await generate(player, 2026).expect(201);
		assert.equal(partial.body.data.aiRecap, null);
		assert.deepEqual(partial.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(partial.body.data.premiumAccessKind, "premium");

		mock.restoreAll();
		const emptyPlayer = await playerWithYear("premium");
		mockPremiumStats(() => {
			throw new Error("stats failed");
		});
		mockAiRecap();
		const empty = await generate(emptyPlayer, 2026).expect(201);
		assert.equal(empty.body.data.premiumStats, null);
		assert.equal(empty.body.data.premiumAccessKind, null);
	});

	void it("sends the owner premium access only to the owner, in the year and in the year list", async () => {
		const player = await playerWithYear();
		const grant = await grantRewindGift(player);
		mockPremiumStats();
		mockAiRecap();
		await generate(player, 2026).expect(201);

		for (const { detail, years } of await visitorViews(player)) {
			assert.equal(detail.body.data.premiumAccess, null);
			assert.equal(detail.body.data.ownerControls, null);
			assert.equal(detail.body.data.premiumAccessKind, "gift");
			assert.equal(years.body.data.premiumAccess, null);
			assert.doesNotMatch(
				JSON.stringify([detail.body, years.body]),
				/feature-grant|expiresAt/
			);
		}

		const ownExpected = {
			allowed: true,
			source: "feature-grant",
			expiresAt: grant.expiresAt?.toISOString()
		};
		const [ownDetail, ownYears] = await Promise.all([
			readRewind(player.user.username, 2026, player.authorization).expect(
				200
			),
			readRewindYears(player.user.username, player.authorization).expect(
				200
			)
		]);
		assert.deepEqual(ownDetail.body.data.premiumAccess, ownExpected);
		assert.deepEqual(ownYears.body.data.premiumAccess, ownExpected);
	});

	void it("keeps one gift label when the owner fires the same generation twice", async () => {
		const player = await playerWithYear();
		await grantRewindGift(player);
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const responses = await Promise.all([
			generate(player, 2026),
			generate(player, 2026)
		]);

		const statuses = responses.map(response => response.status).sort();
		assert.deepEqual(statuses, [201, 409]);
		assert.equal(aiMock.mock.callCount(), 1);
		assert.equal(
			(await findRewindRow(player, 2026))?.premiumAccessKind,
			"gift"
		);
	});
});
