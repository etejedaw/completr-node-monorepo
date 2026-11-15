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
});
