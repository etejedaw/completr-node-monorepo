import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRewindToday } from "../../src/rewind/utils/resolve-rewind-today.util";

const NOW = new Date("2026-10-28T15:30:00.000Z");

void describe("resolveRewindToday", () => {
	void it("uses the real date without an override", () => {
		assert.equal(resolveRewindToday(undefined, NOW), NOW);
		assert.equal(resolveRewindToday("", NOW), NOW);
	});

	void it("replaces today with the override at UTC midnight", () => {
		assert.deepEqual(
			resolveRewindToday("2026-12-01", NOW),
			new Date("2026-12-01T00:00:00.000Z")
		);
	});
});
