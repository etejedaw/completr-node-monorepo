import "./rewind-period-closed-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { useTestDatabase } from "../helpers/database.helper";
import { createRewindEdition } from "../helpers/factories.helper";
import { signUpOn, storeRewind } from "./rewind-generation.helper";
import {
	clearRewindEditions,
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
});

void describe("period after the 2026 edition closed (2027-03-01)", () => {
	void it("reports the last edition as closed to everybody", async () => {
		const owner = await playerWithTwoYears(world);
		const stranger = await signUpOn("2025-01-15T00:00:00.000Z");

		for (const authorization of [
			undefined,
			stranger.authorization,
			owner.authorization
		])
			assert.deepEqual(await readPeriod(owner, authorization), {
				status: "closed",
				year: 2026,
				opensAt: "2026-12-01",
				closesAt: "2027-01-31"
			});
	});

	void it("blocks every ungenerated year with period-closed, premium or not", async () => {
		const free = await playerWithTwoYears(world);
		const premium = await playerWithTwoYears(world, "premium");

		for (const owner of [free, premium])
			assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
				{ year: 2026, generationBlockedBy: "period-closed" },
				{ year: 2025, generationBlockedBy: "period-closed" }
			]);
	});

	void it("does not flag years that were generated or visitors", async () => {
		const owner = await playerWithTwoYears(world);
		await storeRewind(owner, 2026);

		assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
			{ year: 2026, generationBlockedBy: null },
			{ year: 2025, generationBlockedBy: "period-closed" }
		]);
		assert.deepEqual(await readYearBlocks(owner), [
			{ year: 2026, generationBlockedBy: null }
		]);
		assert.equal(await readControlsPeriodStatus(owner, 2026), "closed");
	});

	void it("switches to scheduled when a later edition is created", async () => {
		await createRewindEdition(2027);
		const owner = await playerWithTwoYears(world);

		const period = await readPeriod(owner);
		assert.equal(period.status, "scheduled");
		assert.equal(period.year, 2027);
	});

	void it("answers period-closed over every other reason", async () => {
		const free = await playerWithTwoYears(world);
		await storeRewind(free, 2026);
		const premium = await playerWithTwoYears(world, "premium");
		await storeRewind(premium, 2025, {
			premiumAccessKind: "premium",
			regenerationsLeft: 3
		});

		assert.equal(
			await readRegenerationBlocker(free, 2026),
			"period-closed"
		);
		assert.equal(
			await readRegenerationBlocker(premium, 2025),
			"period-closed"
		);
	});
});
