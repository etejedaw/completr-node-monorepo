import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindRecord } from "../../src/rewind/rewind-record.interface";
import { GenerateRewindSchema } from "../../src/rewind/schemas/generate-rewind.schema";
import { buildRewindOwnerControls } from "../../src/rewind/utils/build-rewind-owner-controls.util";
import { isAiRecapInProgress } from "../../src/rewind/utils/is-ai-recap-in-progress.util";
import { nextGeneratedAt } from "../../src/rewind/utils/next-generated-at.util";
import { planRewindGeneration } from "../../src/rewind/utils/plan-rewind-generation.util";
import { resolveAiRecapState } from "../../src/rewind/utils/resolve-ai-recap-state.util";
import { resolveGraceEndsAt } from "../../src/rewind/utils/resolve-grace-ends-at.util";

const GENERATED_AT = new Date("2026-12-05T10:00:00.000Z");
const DECEMBER = new Date("2026-12-20T00:00:00.000Z");
const GRACE_FIRST_DAY = new Date("2027-01-01T00:00:00.000Z");
const GRACE_LAST_DAY = new Date("2027-01-07T23:59:59.999Z");
const AFTER_GRACE = new Date("2027-01-08T00:00:00.000Z");

function record(overrides: Partial<RewindRecord> = {}): RewindRecord {
	return {
		year: 2026,
		language: "en",
		includesPrivateRuns: false,
		generatedAt: GENERATED_AT,
		regenerationsUsed: 0,
		graceUsed: false,
		aiRecap: null,
		aiRecapStatus: "none",
		aiRecapRequestedAt: null,
		premiumStats: null,
		...overrides
	};
}

const RECAP = {
	headline: "h",
	summary: "s",
	insights: [],
	funFact: "f",
	nextYearChallenge: "n"
};

void describe("planRewindGeneration", () => {
	void it("creates the first generation only without an expected date", () => {
		assert.deepEqual(
			planRewindGeneration({
				record: null,
				expectedGeneratedAt: null,
				today: DECEMBER
			}),
			{ kind: "create" }
		);
		assert.deepEqual(
			planRewindGeneration({
				record: null,
				expectedGeneratedAt: GENERATED_AT.toISOString(),
				today: DECEMBER
			}),
			{ kind: "conflict" }
		);
	});

	void it("answers a conflict for a missing or stale expected date", () => {
		for (const expected of [
			null,
			"2026-12-05T09:59:59.999Z",
			"2020-01-01T00:00:00.000Z"
		]) {
			assert.deepEqual(
				planRewindGeneration({
					record: record(),
					expectedGeneratedAt: expected,
					today: DECEMBER
				}),
				{ kind: "conflict" },
				String(expected)
			);
		}
	});

	void it("accepts the same instant written with another offset", () => {
		assert.deepEqual(
			planRewindGeneration({
				record: record(),
				expectedGeneratedAt: "2026-12-05T07:00:00-03:00",
				today: DECEMBER
			}),
			{ kind: "regenerate", spendsGrace: false }
		);
	});

	void it("spends the grace first inside January 1-7 and the normal one after", () => {
		const expectedGeneratedAt = GENERATED_AT.toISOString();
		for (const today of [GRACE_FIRST_DAY, GRACE_LAST_DAY]) {
			assert.deepEqual(
				planRewindGeneration({
					record: record({ regenerationsUsed: 1 }),
					expectedGeneratedAt,
					today
				}),
				{ kind: "regenerate", spendsGrace: true }
			);
		}
		assert.deepEqual(
			planRewindGeneration({
				record: record({ graceUsed: true }),
				expectedGeneratedAt,
				today: GRACE_FIRST_DAY
			}),
			{ kind: "regenerate", spendsGrace: false }
		);
		assert.deepEqual(
			planRewindGeneration({
				record: record({ regenerationsUsed: 1 }),
				expectedGeneratedAt,
				today: AFTER_GRACE
			}),
			{ kind: "limit-reached" }
		);
		assert.deepEqual(
			planRewindGeneration({
				record: record({ regenerationsUsed: 1, graceUsed: true }),
				expectedGeneratedAt,
				today: GRACE_LAST_DAY
			}),
			{ kind: "limit-reached" }
		);
	});

	void it("does not open a grace window for an older year", () => {
		assert.deepEqual(
			planRewindGeneration({
				record: record({ year: 2025, regenerationsUsed: 1 }),
				expectedGeneratedAt: GENERATED_AT.toISOString(),
				today: GRACE_FIRST_DAY
			}),
			{ kind: "limit-reached" }
		);
	});
});

void describe("resolveGraceEndsAt", () => {
	void it("is January 7 of the next year only while the grace is open and unused", () => {
		assert.equal(
			resolveGraceEndsAt(record(), GRACE_FIRST_DAY),
			"2027-01-07"
		);
		assert.equal(
			resolveGraceEndsAt(record(), GRACE_LAST_DAY),
			"2027-01-07"
		);
		assert.equal(resolveGraceEndsAt(record(), AFTER_GRACE), null);
		assert.equal(resolveGraceEndsAt(record(), DECEMBER), null);
		assert.equal(
			resolveGraceEndsAt(record({ graceUsed: true }), GRACE_FIRST_DAY),
			null
		);
	});
});

void describe("resolveAiRecapState", () => {
	void it("maps the stored status and the current role", () => {
		assert.equal(
			resolveAiRecapState(
				record({ aiRecapStatus: "ready", aiRecap: RECAP }),
				false
			),
			"ready"
		);
		assert.equal(
			resolveAiRecapState(record({ aiRecapStatus: "failed" }), true),
			"failed"
		);
		assert.equal(
			resolveAiRecapState(record({ aiRecapStatus: "pending" }), true),
			"failed"
		);
		assert.equal(resolveAiRecapState(record(), true), "available");
		assert.equal(resolveAiRecapState(record(), false), "unavailable");
		assert.equal(
			resolveAiRecapState(record({ aiRecapStatus: "ready" }), false),
			"unavailable"
		);
	});
});

void describe("isAiRecapInProgress", () => {
	const now = new Date("2026-12-20T12:00:00.000Z");

	void it("is true only for a pending recap requested less than two minutes ago", () => {
		const pendingSince = (milliseconds: number) =>
			record({
				aiRecapStatus: "pending",
				aiRecapRequestedAt: new Date(now.getTime() - milliseconds)
			});

		assert.equal(isAiRecapInProgress(pendingSince(0), now), true);
		assert.equal(isAiRecapInProgress(pendingSince(119_999), now), true);
		assert.equal(isAiRecapInProgress(pendingSince(120_000), now), false);
		assert.equal(
			isAiRecapInProgress(
				record({ aiRecapStatus: "failed", aiRecapRequestedAt: now }),
				now
			),
			false
		);
		assert.equal(
			isAiRecapInProgress(record({ aiRecapStatus: "pending" }), now),
			false
		);
	});
});

void describe("buildRewindOwnerControls", () => {
	void it("counts the regenerations left and whether the owner can regenerate", () => {
		assert.deepEqual(buildRewindOwnerControls(record(), DECEMBER, false), {
			includesPrivateRuns: false,
			regenerationsLeft: 1,
			graceEndsAt: null,
			canRegenerate: true,
			aiRecapState: "unavailable"
		});
		assert.deepEqual(
			buildRewindOwnerControls(
				record({ regenerationsUsed: 1, includesPrivateRuns: true }),
				GRACE_FIRST_DAY,
				true
			),
			{
				includesPrivateRuns: true,
				regenerationsLeft: 0,
				graceEndsAt: "2027-01-07",
				canRegenerate: true,
				aiRecapState: "available"
			}
		);
		assert.equal(
			buildRewindOwnerControls(
				record({ regenerationsUsed: 1 }),
				AFTER_GRACE,
				true
			).canRegenerate,
			false
		);
	});

	void it("never answers negative regenerations for corrupted counters", () => {
		assert.equal(
			buildRewindOwnerControls(
				record({ regenerationsUsed: 5 }),
				DECEMBER,
				false
			).regenerationsLeft,
			0
		);
	});
});

void describe("nextGeneratedAt", () => {
	void it("always moves forward so a stale expected date never matches again", () => {
		const now = new Date("2026-12-20T12:00:00.000Z");
		assert.equal(nextGeneratedAt(null, now), now);
		assert.equal(nextGeneratedAt(GENERATED_AT, now), now);
		assert.equal(nextGeneratedAt(now, now).getTime(), now.getTime() + 1);
	});
});

void describe("GenerateRewindSchema", () => {
	const valid = {
		language: "es",
		includePrivateRuns: false,
		expectedGeneratedAt: null
	};

	void it("accepts a first generation and a regeneration", () => {
		assert.equal(GenerateRewindSchema.safeParse(valid).success, true);
		assert.equal(
			GenerateRewindSchema.safeParse({
				...valid,
				expectedGeneratedAt: "2026-12-05T10:00:00.000Z"
			}).success,
			true
		);
	});

	void it("rejects garbage bodies", () => {
		const garbage = [
			{ ...valid, language: "fr" },
			{ ...valid, language: "ES" },
			{ ...valid, language: "" },
			{ ...valid, includePrivateRuns: "false" },
			{ ...valid, includePrivateRuns: 0 },
			{ ...valid, expectedGeneratedAt: "2026-12-05" },
			{ ...valid, expectedGeneratedAt: "<script>" },
			{ ...valid, expectedGeneratedAt: "🔥".repeat(500) },
			{ ...valid, extra: true },
			{ language: "en", includePrivateRuns: true },
			{},
			null,
			"en"
		];
		for (const body of garbage) {
			assert.equal(
				GenerateRewindSchema.safeParse(body).success,
				false,
				JSON.stringify(body)
			);
		}
	});
});
