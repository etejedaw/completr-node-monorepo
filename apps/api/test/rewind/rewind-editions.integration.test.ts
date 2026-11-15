import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { Rewind } from "../../src/rewind/rewind.model";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { type RewindEditionRecord } from "../../src/rewind-editions/rewind-editions.interface";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createRewindEdition
} from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	AI_RECAP,
	findRewindRow,
	generate,
	mockAiRecap,
	mockPremiumStats,
	readRewind,
	readRewindYears,
	regenerationOf,
	requestAiRecap,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

let platform: Platform;
let games: Record<"hades" | "celeste", Game>;

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" })
	};
});

afterEach(() => {
	mock.restoreAll();
});

async function replaceEdition(overrides: Partial<RewindEditionRecord> = {}) {
	await RewindEdition.destroy({ where: {} });
	return createRewindEdition(2026, {
		premiumRegenerations: 2,
		giftRegenerations: 1,
		...overrides
	});
}

const CLOSED_YESTERDAY = {
	opensAt: "2026-11-01",
	closesAt: "2026-12-14",
	graceStartsAt: "2026-12-10",
	graceEndsAt: "2026-12-14"
};

async function playerWithTwoYears(role: Account["user"]["role"] = "user") {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
	await addRun(player, games.hades, platform, { finishedAt: "2026-03-10" });
	await addRun(player, games.celeste, platform, { finishedAt: "2025-07-07" });
	return player;
}

function grantFeature(player: Account, feature: "rewind.premium" | "*") {
	return PremiumGrant.create({
		userId: player.user.id,
		feature,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
	});
}

function mockPremiumGeneration() {
	mockPremiumStats();
	return mockAiRecap();
}

function countRewinds(player: Account) {
	return Rewind.count({ where: { userId: player.user.id } });
}

void describe("the period of the edition", () => {
	void it("still generates and regenerates on the closing day", async () => {
		await replaceEdition({
			opensAt: "2026-11-01",
			closesAt: "2026-12-15",
			graceStartsAt: "2026-12-10",
			graceEndsAt: "2026-12-12"
		});
		const player = await playerWithTwoYears("premium");
		const aiMock = mockPremiumGeneration();

		const first = await generate(player, 2026).expect(201);
		assert.equal(first.body.data.ownerControls.periodOpen, true);
		assert.equal(first.body.data.ownerControls.closesAt, "2026-12-15");
		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).expect(200);

		assert.equal(aiMock.mock.callCount(), 2);
		assert.equal((await findRewindRow(player, 2026))?.regenerationsLeft, 0);
	});

	void it("answers REWIND_PERIOD_CLOSED the day after closing and spends nothing", async () => {
		await replaceEdition(CLOSED_YESTERDAY);
		const player = await playerWithTwoYears("premium");
		const aiMock = mockPremiumGeneration();
		const stored = await storeRewind(player, 2026, {
			premiumAccessKind: "premium",
			regenerationsLeft: 2
		});

		const regeneration = await generate(
			player,
			2026,
			regenerationOf(stored.generatedAt.toISOString())
		);
		const recap = await requestAiRecap(player, 2026);
		const older = await generate(player, 2025);

		for (const response of [regeneration, recap, older]) {
			assert.equal(response.status, 409);
			assert.equal(response.body.type, "REWIND_PERIOD_CLOSED");
		}
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.regenerationsLeft, 2);
		assert.equal(row?.aiRecapStatus, "none");
		assert.equal(
			row?.generatedAt.toISOString(),
			stored.generatedAt.toISOString()
		);
		assert.equal(await countRewinds(player), 1);
		assert.equal(aiMock.mock.callCount(), 0);
	});

	void it("keeps showing a generated Rewind after closing, with the controls closed", async () => {
		await replaceEdition(CLOSED_YESTERDAY);
		const player = await playerWithTwoYears("premium");
		await storeRewind(player, 2026, {
			premiumAccessKind: "premium",
			regenerationsLeft: 1
		});

		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.deepEqual(own.body.data.ownerControls, {
			includesPrivateRuns: false,
			includesNotes: false,
			regenerationsLeft: 1,
			graceEndsAt: null,
			canRegenerate: false,
			regenerationBlockedBy: "period-closed",
			aiRecapState: "unavailable",
			periodOpen: false,
			periodStatus: "closed",
			closesAt: null,
			frozenAt: null
		});
		assert.equal(own.body.data.isSpotlight, false);
		assert.equal(own.body.data.design, "2026");
		assert.equal(own.body.data.frozenAt, null);

		const visitor = await readRewind(player.user.username, 2026).expect(
			200
		);
		assert.equal(visitor.body.data.ownerControls, null);
		const years = await readRewindYears(player.user.username).expect(200);
		assert.equal(years.body.data.spotlightYear, null);
	});

	void it("does not let a player who never generated during the period do it later", async () => {
		await replaceEdition(CLOSED_YESTERDAY);
		const player = await playerWithTwoYears();

		const list = await readRewindYears(
			player.user.username,
			player.authorization
		).expect(200);
		assert.deepEqual(
			list.body.data.years.map((year: { year: number }) => year.year),
			[2026, 2025]
		);
		const response = await generate(player, 2026);
		assert.equal(response.status, 409);
		assert.equal(response.body.type, "REWIND_PERIOD_CLOSED");
		assert.equal(await countRewinds(player), 0);
	});

	void it("keeps the edition year out of existence until its opening day", async () => {
		await replaceEdition({ opensAt: "2026-12-16" });
		const player = await playerWithTwoYears();

		const notYet = await generate(player, 2026);
		assert.equal(notYet.status, 404);
		assert.equal(notYet.body.type, "REWIND_NOT_FOUND");
		const closed = await generate(player, 2025);
		assert.equal(closed.status, 409);
		assert.equal(closed.body.type, "REWIND_PERIOD_CLOSED");

		await replaceEdition({ opensAt: "2026-12-15" });
		await generate(player, 2026).expect(201);
	});

	void it("treats a missing edition as a closed Rewind", async () => {
		await RewindEdition.destroy({ where: {} });
		const player = await playerWithTwoYears("premium");

		const current = await generate(player, 2026);
		assert.equal(current.status, 404);
		const older = await generate(player, 2025);
		assert.equal(older.status, 409);
		assert.equal(older.body.type, "REWIND_PERIOD_CLOSED");

		const years = await readRewindYears(
			player.user.username,
			player.authorization
		).expect(200);
		assert.equal(years.body.data.spotlightYear, null);
	});
});

void describe("previous years", () => {
	void it("answers REWIND_YEAR_REQUIRES_PREMIUM to free and gift owners without creating anything", async () => {
		await replaceEdition();
		const free = await playerWithTwoYears();
		const gifted = await playerWithTwoYears();
		await grantFeature(gifted, "rewind.premium");
		const aiMock = mockPremiumGeneration();

		for (const player of [free, gifted]) {
			const responses = await Promise.all([
				generate(player, 2025),
				generate(player, 2025)
			]);
			for (const response of responses) {
				assert.equal(response.status, 403);
				assert.equal(
					response.body.type,
					"REWIND_YEAR_REQUIRES_PREMIUM"
				);
			}
			assert.equal(await countRewinds(player), 0);
		}
		assert.equal(aiMock.mock.callCount(), 0);
	});

	void it("lets full premium generate a previous year with the premium quota and the current design", async () => {
		await replaceEdition({ premiumRegenerations: 3 });
		const fullGrant = await playerWithTwoYears();
		await grantFeature(fullGrant, "*");
		const aiMock = mockPremiumGeneration();

		const response = await generate(fullGrant, 2025).expect(201);

		assert.equal(response.body.data.year, 2025);
		assert.equal(response.body.data.design, "2026");
		assert.equal(response.body.data.isSpotlight, false);
		assert.deepEqual(response.body.data.aiRecap, AI_RECAP);
		assert.equal(response.body.data.ownerControls.regenerationsLeft, 2);
		assert.equal(response.body.data.ownerControls.graceEndsAt, null);
		assert.equal(aiMock.mock.callCount(), 1);
	});

	void it("spends the roll of that year when full premium regenerates it in a later edition", async () => {
		await replaceEdition();
		const player = await playerWithTwoYears("premium");
		mockPremiumGeneration();
		const [older, current] = await Promise.all([
			storeRewind(player, 2025, {
				premiumAccessKind: "premium",
				regenerationsLeft: 1
			}),
			storeRewind(player, 2026, {
				premiumAccessKind: "premium",
				regenerationsLeft: 2
			})
		]);

		await generate(
			player,
			2025,
			regenerationOf(older.generatedAt.toISOString(), { language: "es" })
		).expect(200);
		const regenerated = await findRewindRow(player, 2025);
		assert.equal(regenerated?.language, "es");
		const limit = await generate(
			player,
			2025,
			regenerationOf(regenerated?.generatedAt.toISOString() ?? "")
		);

		assert.equal(limit.status, 409);
		assert.equal(limit.body.type, "REWIND_REGENERATION_LIMIT");
		assert.equal((await findRewindRow(player, 2025))?.regenerationsLeft, 0);
		assert.equal(
			(await findRewindRow(player, 2026))?.regenerationsLeft,
			current.regenerationsLeft
		);
	});

	void it("closes a previous year to an owner who lost full premium, even with rolls left", async () => {
		await replaceEdition();
		const player = await playerWithTwoYears();
		const grant = await grantFeature(player, "*");
		mockPremiumGeneration();
		const first = await generate(player, 2025).expect(201);
		await grant.update({ expiresAt: new Date(Date.now() - 1000) });
		await grantFeature(player, "rewind.premium");

		const own = await readRewind(
			player.user.username,
			2025,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.regenerationsLeft, 1);
		assert.equal(own.body.data.ownerControls.canRegenerate, false);

		const response = await generate(
			player,
			2025,
			regenerationOf(first.body.data.generatedAt)
		);
		assert.equal(response.status, 403);
		assert.equal(response.body.type, "REWIND_YEAR_REQUIRES_PREMIUM");
		const recap = await requestAiRecap(player, 2025);
		assert.equal(recap.status, 403);
		assert.equal((await findRewindRow(player, 2025))?.regenerationsLeft, 1);
	});
});

void describe("the quota of rolls", () => {
	void it("creates the base without the AI when the quota is zero and answers the limit afterwards", async () => {
		await replaceEdition({ premiumRegenerations: 0 });
		const player = await playerWithTwoYears("premium");
		const aiMock = mockPremiumGeneration();

		const created = await generate(player, 2026).expect(201);
		assert.equal(created.body.data.aiRecap, null);
		assert.equal(
			created.body.data.ownerControls.aiRecapState,
			"unavailable"
		);
		assert.equal(created.body.data.ownerControls.canRegenerate, false);
		assert.equal(created.body.data.premiumAccessKind, null);
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.premiumAccessKind, "premium");
		assert.equal(row?.aiRecapStatus, "none");

		const recap = await requestAiRecap(player, 2026);
		assert.equal(recap.status, 409);
		assert.equal(recap.body.type, "REWIND_REGENERATION_LIMIT");
		const regeneration = await generate(
			player,
			2026,
			regenerationOf(created.body.data.generatedAt)
		);
		assert.equal(regeneration.status, 409);
		assert.equal(regeneration.body.type, "REWIND_REGENERATION_LIMIT");
		assert.equal(aiMock.mock.callCount(), 0);
	});

	void it("spends a gift roll on the AI recap and takes only one on a double click", async () => {
		await replaceEdition({ giftRegenerations: 2 });
		const player = await playerWithTwoYears();
		await generate(player, 2026).expect(201);
		await grantFeature(player, "rewind.premium");
		mockPremiumStats();
		const aiMock = mockAiRecap(
			() =>
				new Promise(resolve => {
					setTimeout(() => resolve(AI_RECAP), 50);
				})
		);

		const responses = await Promise.all([
			requestAiRecap(player, 2026),
			requestAiRecap(player, 2026)
		]);

		assert.deepEqual(
			responses.map(response => response.status).sort(),
			[200, 409]
		);
		assert.equal(
			responses.find(response => response.status === 409)?.body.type,
			"REWIND_AI_RECAP_IN_PROGRESS"
		);
		assert.equal(aiMock.mock.callCount(), 1);
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.premiumAccessKind, "gift");
		assert.equal(row?.regenerationsLeft, 1);
	});

	void it("gives the roll back when the AI fails on a regeneration or on the AI recap", async () => {
		await replaceEdition();
		const player = await playerWithTwoYears("premium");
		mockPremiumStats();
		const failing = mockAiRecap(() => Promise.reject(new Error("down")));

		const first = await generate(player, 2026).expect(201);
		assert.equal(first.body.data.ownerControls.regenerationsLeft, 2);
		const regenerated = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).expect(200);
		assert.equal(
			regenerated.body.data.ownerControls.aiRecapState,
			"failed"
		);
		assert.equal(regenerated.body.data.ownerControls.regenerationsLeft, 2);
		const recap = await requestAiRecap(player, 2026);
		assert.equal(recap.status, 503);

		assert.equal(failing.mock.callCount(), 3);
		assert.equal((await findRewindRow(player, 2026))?.regenerationsLeft, 2);
	});

	void it("lets one of two regenerations fired with the last roll win and never goes below zero", async () => {
		await replaceEdition();
		const player = await playerWithTwoYears("premium");
		const aiMock = mockPremiumGeneration();
		const stored = await storeRewind(player, 2026, {
			premiumAccessKind: "premium",
			regenerationsLeft: 1
		});
		const body = regenerationOf(stored.generatedAt.toISOString());

		const responses = await Promise.all([
			generate(player, 2026, body),
			generate(player, 2026, body),
			requestAiRecap(player, 2026)
		]);

		const statuses = responses.map(response => response.status);
		assert.equal(
			statuses.filter(status => status === 200).length >= 1,
			true
		);
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.regenerationsLeft, 0);
		assert.equal(aiMock.mock.callCount(), 1);
		for (const response of responses.filter(r => r.status !== 200))
			assert.match(
				response.body.type,
				/REWIND_GENERATION_CONFLICT|REWIND_REGENERATION_LIMIT|REWIND_AI_RECAP_IN_PROGRESS|REWIND_AI_RECAP_EXISTS/
			);
	});

	void it("keeps the quota assigned at the first AI use when the edition changes later", async () => {
		await replaceEdition({ premiumRegenerations: 1 });
		const player = await playerWithTwoYears("premium");
		mockPremiumGeneration();
		const first = await generate(player, 2026).expect(201);
		assert.equal(first.body.data.ownerControls.regenerationsLeft, 0);

		await RewindEdition.update(
			{ premiumRegenerations: 5 },
			{ where: { year: 2026 } }
		);
		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.regenerationsLeft, 0);
		assert.equal(own.body.data.ownerControls.canRegenerate, false);
	});
});
