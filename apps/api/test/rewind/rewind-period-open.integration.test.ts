import "./rewind-period-open-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { useTestDatabase } from "../helpers/database.helper";
import { createRewindEdition } from "../helpers/factories.helper";
import { signUpOn, storeRewind } from "./rewind-generation.helper";
import {
	clearRewindEditions,
	giftRewindPremium,
	playerWithTwoYears,
	readControlsPeriodStatus,
	readPeriod,
	readRegenerationBlocker,
	readYearBlocks,
	seedRewindPeriodWorld
} from "./rewind-period.helper";

let world: Awaited<ReturnType<typeof seedRewindPeriodWorld>>;

useTestDatabase(async () => {
	world = await seedRewindPeriodWorld();
});

beforeEach(async () => {
	await clearRewindEditions();
	await createRewindEdition(2026);
	await createRewindEdition(2027);
});

const OPEN_PERIOD = {
	status: "open",
	year: 2026,
	opensAt: "2026-12-01",
	closesAt: "2027-01-31"
};

void describe("period and generation blockers with the 2026 edition open (2026-12-15)", () => {
	void it("reports the open edition, not the scheduled one, to everybody", async () => {
		const owner = await playerWithTwoYears(world);
		const stranger = await signUpOn("2025-01-15T00:00:00.000Z");

		for (const authorization of [
			undefined,
			stranger.authorization,
			owner.authorization
		])
			assert.deepEqual(
				await readPeriod(owner, authorization),
				OPEN_PERIOD
			);
	});

	void it("blocks the previous year for an owner without full premium", async () => {
		const owner = await playerWithTwoYears(world);

		assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
			{ year: 2026, generationBlockedBy: null },
			{ year: 2025, generationBlockedBy: "requires-premium" }
		]);
	});

	void it("does not treat a rewind gift as full premium", async () => {
		const owner = await playerWithTwoYears(world);
		await giftRewindPremium(owner);

		assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
			{ year: 2026, generationBlockedBy: null },
			{ year: 2025, generationBlockedBy: "requires-premium" }
		]);
	});

	void it("blocks nothing for an owner with full premium", async () => {
		const owner = await playerWithTwoYears(world, "premium");

		assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
			{ year: 2026, generationBlockedBy: null },
			{ year: 2025, generationBlockedBy: null }
		]);
	});

	void it("never flags generated years or years seen by visitors", async () => {
		const owner = await playerWithTwoYears(world);
		await storeRewind(owner, 2025);
		const stranger = await signUpOn("2025-01-15T00:00:00.000Z");

		assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
			{ year: 2026, generationBlockedBy: null },
			{ year: 2025, generationBlockedBy: null }
		]);
		for (const authorization of [undefined, stranger.authorization])
			assert.deepEqual(await readYearBlocks(owner, authorization), [
				{ year: 2025, generationBlockedBy: null }
			]);
	});

	void it("reports the open period in the owner controls", async () => {
		const owner = await playerWithTwoYears(world);
		await storeRewind(owner, 2026);

		assert.equal(await readControlsPeriodStatus(owner, 2026), "open");
	});

	void it("explains why an owner cannot regenerate, with the reason priority", async () => {
		const free = await playerWithTwoYears(world);
		await storeRewind(free, 2026);
		await storeRewind(free, 2025);
		assert.equal(await readRegenerationBlocker(free, 2026), "no-ai-access");
		assert.equal(
			await readRegenerationBlocker(free, 2025),
			"requires-premium"
		);

		const gifted = await playerWithTwoYears(world);
		await giftRewindPremium(gifted);
		await storeRewind(gifted, 2026, {
			premiumAccessKind: "gift",
			regenerationsLeft: 0
		});
		assert.equal(
			await readRegenerationBlocker(gifted, 2026),
			"no-regenerations-left"
		);

		const premium = await playerWithTwoYears(world, "premium");
		await storeRewind(premium, 2026, {
			premiumAccessKind: "premium",
			regenerationsLeft: 2
		});
		await storeRewind(premium, 2025, {
			premiumAccessKind: "premium",
			regenerationsLeft: 1
		});
		assert.equal(await readRegenerationBlocker(premium, 2026), null);
		assert.equal(await readRegenerationBlocker(premium, 2025), null);
	});
});
