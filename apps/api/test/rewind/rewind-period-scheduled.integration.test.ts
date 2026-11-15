import "./rewind-period-scheduled-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { useTestDatabase } from "../helpers/database.helper";
import { createRewindEdition } from "../helpers/factories.helper";
import { storeRewind } from "./rewind-generation.helper";
import {
	clearRewindEditions,
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
});

void describe("period before the first edition opens (2026-06-15)", () => {
	void it("answers null when there is no edition at all", async () => {
		const owner = await playerWithTwoYears(world);

		assert.equal(await readPeriod(owner), null);
		assert.equal(await readPeriod(owner, owner.authorization), null);
	});

	void it("reports the next edition as scheduled and blocks generation as closed", async () => {
		await createRewindEdition(2026);
		const owner = await playerWithTwoYears(world, "premium");

		assert.deepEqual(await readPeriod(owner), {
			status: "scheduled",
			year: 2026,
			opensAt: "2026-12-01",
			closesAt: "2027-01-31"
		});
		assert.deepEqual(await readYearBlocks(owner, owner.authorization), [
			{ year: 2025, generationBlockedBy: "period-closed" }
		]);
		assert.deepEqual(await readYearBlocks(owner), []);
	});

	void it("picks the nearest scheduled edition and ignores the closed ones", async () => {
		await createRewindEdition(2025);
		await createRewindEdition(2027);
		await createRewindEdition(2026);
		const owner = await playerWithTwoYears(world);

		const period = await readPeriod(owner);
		assert.equal(period.status, "scheduled");
		assert.equal(period.year, 2026);
	});

	void it("reports the scheduled status in the controls of a generated year", async () => {
		await createRewindEdition(2026);
		const owner = await playerWithTwoYears(world);
		await storeRewind(owner, 2025);

		assert.equal(await readControlsPeriodStatus(owner, 2025), "scheduled");
	});
});
