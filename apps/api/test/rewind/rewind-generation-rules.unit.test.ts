import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindRecord } from "../../src/rewind/rewind-record.interface";
import { AddRewindAiRecapSchema } from "../../src/rewind/schemas/add-rewind-ai-recap.schema";
import { GenerateRewindSchema } from "../../src/rewind/schemas/generate-rewind.schema";
import { buildRewindOwnerControls } from "../../src/rewind/utils/build-rewind-owner-controls.util";
import { isAiRecapInProgress } from "../../src/rewind/utils/is-ai-recap-in-progress.util";
import { nextGeneratedAt } from "../../src/rewind/utils/next-generated-at.util";
import { planRewindGeneration } from "../../src/rewind/utils/plan-rewind-generation.util";
import { resolveAiRecapState } from "../../src/rewind/utils/resolve-ai-recap-state.util";
import { resolveRewindAiBudget } from "../../src/rewind/utils/resolve-rewind-ai-budget.util";
import { resolveRewindAiUseChanges } from "../../src/rewind/utils/resolve-rewind-ai-use-changes.util";
import { calendarOn, editionOf } from "./rewind-run.builder";

const GENERATED_AT = new Date("2026-12-05T10:00:00.000Z");
const EDITION = editionOf(2026, {
	premiumRegenerations: 3,
	giftRegenerations: 1
});
const BEFORE_OPENING = new Date("2026-11-30T23:59:59.999Z");
const DECEMBER = new Date("2026-12-20T00:00:00.000Z");
const GRACE_FIRST_DAY = new Date("2027-01-01T00:00:00.000Z");
const GRACE_LAST_DAY = new Date("2027-01-07T23:59:59.999Z");
const AFTER_GRACE = new Date("2027-01-08T00:00:00.000Z");
const LAST_DAY = new Date("2027-01-31T23:59:59.999Z");
const AFTER_CLOSING = new Date("2027-02-01T00:00:00.000Z");

function on(today: Date) {
	return calendarOn(today, 2000, EDITION);
}

function record(overrides: Partial<RewindRecord> = {}): RewindRecord {
	return {
		year: 2026,
		language: "en",
		includesPrivateRuns: false,
		includesNotes: false,
		generatedAt: GENERATED_AT,
		regenerationsLeft: 0,
		graceUsed: false,
		aiRecap: null,
		aiRecapStatus: "none",
		aiRecapRequestedAt: null,
		premiumStats: null,
		premiumAccessKind: null,
		frozenAt: null,
		...overrides
	};
}

function premiumRecord(overrides: Partial<RewindRecord> = {}) {
	return record({
		premiumAccessKind: "premium",
		regenerationsLeft: 1,
		...overrides
	});
}

const RECAP = {
	headline: "h",
	summary: "s",
	insights: [],
	funFact: "f",
	nextYearChallenge: "n"
};

const EXPECTED = GENERATED_AT.toISOString();

void describe("planRewindGeneration", () => {
	void it("creates the first generation only without an expected date", () => {
		const plan = planRewindGeneration({
			year: 2026,
			record: null,
			expectedGeneratedAt: null,
			calendar: on(DECEMBER),
			accessKind: null
		});
		assert.equal(plan.kind, "create");
		assert.deepEqual(
			planRewindGeneration({
				year: 2026,
				record: null,
				expectedGeneratedAt: EXPECTED,
				calendar: on(DECEMBER),
				accessKind: "premium"
			}),
			{ kind: "conflict" }
		);
	});

	void it("assigns the quota of the access on the first generation and spends one roll", () => {
		const create = (accessKind: "premium" | "gift" | null) => {
			const plan = planRewindGeneration({
				year: 2026,
				record: null,
				expectedGeneratedAt: null,
				calendar: on(DECEMBER),
				accessKind
			});
			assert.equal(plan.kind, "create");
			return plan.kind === "create" ? plan.budget : null;
		};

		const premium = create("premium");
		assert.deepEqual(premium?.assignment, {
			premiumAccessKind: "premium",
			regenerationsLeft: 3
		});
		assert.equal(premium?.spend, "regeneration");

		const gift = create("gift");
		assert.deepEqual(gift?.assignment, {
			premiumAccessKind: "gift",
			regenerationsLeft: 1
		});
		assert.equal(gift?.spend, "regeneration");

		const free = create(null);
		assert.equal(free?.assignment, null);
		assert.equal(free?.spend, null);
	});

	void it("creates the base without the AI when the quota is zero", () => {
		const plan = planRewindGeneration({
			year: 2026,
			record: null,
			expectedGeneratedAt: null,
			calendar: calendarOn(DECEMBER, 2000, editionOf(2026)),
			accessKind: "premium"
		});
		assert.equal(plan.kind, "create");
		if (plan.kind !== "create") return;
		assert.deepEqual(plan.budget.assignment, {
			premiumAccessKind: "premium",
			regenerationsLeft: 0
		});
		assert.equal(plan.budget.spend, null);
	});

	void it("answers a conflict for a missing or stale expected date", () => {
		for (const expected of [
			null,
			"2026-12-05T09:59:59.999Z",
			"2020-01-01T00:00:00.000Z"
		]) {
			assert.deepEqual(
				planRewindGeneration({
					year: 2026,
					record: premiumRecord(),
					expectedGeneratedAt: expected,
					calendar: on(DECEMBER),
					accessKind: "premium"
				}),
				{ kind: "conflict" },
				String(expected)
			);
		}
	});

	void it("checks the expected date before the access, so a stale click spends nothing", () => {
		assert.deepEqual(
			planRewindGeneration({
				year: 2026,
				record: record(),
				expectedGeneratedAt: "2020-01-01T00:00:00.000Z",
				calendar: on(DECEMBER),
				accessKind: null
			}),
			{ kind: "conflict" }
		);
	});

	void it("refuses to regenerate without access to the AI, even with rolls left", () => {
		for (const stored of [
			record(),
			premiumRecord({ regenerationsLeft: 3 })
		]) {
			assert.deepEqual(
				planRewindGeneration({
					year: 2026,
					record: stored,
					expectedGeneratedAt: EXPECTED,
					calendar: on(DECEMBER),
					accessKind: null
				}),
				{ kind: "premium-required" }
			);
		}
	});

	void it("accepts the same instant written with another offset", () => {
		const plan = planRewindGeneration({
			year: 2026,
			record: premiumRecord(),
			expectedGeneratedAt: "2026-12-05T07:00:00-03:00",
			calendar: on(DECEMBER),
			accessKind: "premium"
		});
		assert.equal(plan.kind, "regenerate");
		assert.equal(
			plan.kind === "regenerate" && plan.budget.spend,
			"regeneration"
		);
	});

	void it("spends the grace first inside its window and the rolls after", () => {
		const spendOn = (today: Date, stored: RewindRecord) => {
			const plan = planRewindGeneration({
				year: 2026,
				record: stored,
				expectedGeneratedAt: EXPECTED,
				calendar: on(today),
				accessKind: "premium"
			});
			return plan.kind === "regenerate" ? plan.budget.spend : plan.kind;
		};

		for (const today of [GRACE_FIRST_DAY, GRACE_LAST_DAY])
			assert.equal(
				spendOn(today, premiumRecord({ regenerationsLeft: 0 })),
				"grace"
			);
		assert.equal(
			spendOn(GRACE_FIRST_DAY, premiumRecord({ graceUsed: true })),
			"regeneration"
		);
		assert.equal(
			spendOn(AFTER_GRACE, premiumRecord({ regenerationsLeft: 0 })),
			"limit-reached"
		);
		assert.equal(
			spendOn(
				GRACE_LAST_DAY,
				premiumRecord({ regenerationsLeft: 0, graceUsed: true })
			),
			"limit-reached"
		);
		assert.equal(spendOn(LAST_DAY, premiumRecord()), "regeneration");
	});

	void it("never opens the grace for an older year", () => {
		const plan = planRewindGeneration({
			year: 2025,
			record: premiumRecord({ year: 2025, regenerationsLeft: 0 }),
			expectedGeneratedAt: EXPECTED,
			calendar: on(GRACE_FIRST_DAY),
			accessKind: "premium"
		});
		assert.deepEqual(plan, { kind: "limit-reached" });
	});

	void it("gives an owner who generated without access the quota of the access they have now", () => {
		const plan = planRewindGeneration({
			year: 2026,
			record: record(),
			expectedGeneratedAt: EXPECTED,
			calendar: on(DECEMBER),
			accessKind: "gift"
		});
		assert.equal(plan.kind, "regenerate");
		if (plan.kind !== "regenerate") return;
		assert.deepEqual(plan.budget.assignment, {
			premiumAccessKind: "gift",
			regenerationsLeft: 1
		});
		assert.equal(plan.budget.spend, "regeneration");
	});

	void it("keeps the first quota when the access changes later", () => {
		const plan = planRewindGeneration({
			year: 2026,
			record: record({ premiumAccessKind: "gift", regenerationsLeft: 0 }),
			expectedGeneratedAt: EXPECTED,
			calendar: on(DECEMBER),
			accessKind: "premium"
		});
		assert.deepEqual(plan, { kind: "limit-reached" });
	});
});

void describe("resolveRewindAiBudget", () => {
	void it("spends nothing outside the period, even with rolls and access", () => {
		for (const today of [BEFORE_OPENING, AFTER_CLOSING]) {
			const budget = resolveRewindAiBudget(
				premiumRecord({ regenerationsLeft: 2 }),
				on(today),
				"premium"
			);
			assert.equal(budget.edition, null);
			assert.equal(budget.spend, null);
			assert.equal(budget.regenerationsLeft, 2);
			assert.equal(budget.graceEndsAt, null);
		}
	});

	void it("lets only full premium use the AI on a previous year", () => {
		const older = record({ year: 2025 });
		const premium = resolveRewindAiBudget(older, on(DECEMBER), "premium");
		assert.equal(premium.yearAllowed, true);
		assert.equal(premium.spend, "regeneration");

		const gift = resolveRewindAiBudget(older, on(DECEMBER), "gift");
		assert.equal(gift.yearAllowed, false);
		assert.equal(gift.spend, null);
	});

	void it("keeps the rolls of an owner who lost the access but lets none be used", () => {
		const budget = resolveRewindAiBudget(
			premiumRecord({ regenerationsLeft: 2 }),
			on(GRACE_FIRST_DAY),
			null
		);
		assert.equal(budget.regenerationsLeft, 2);
		assert.equal(budget.graceEndsAt, null);
		assert.equal(budget.spend, null);
	});

	void it("adds the edition quota to the rolls an admin gave before the first use", () => {
		const budget = resolveRewindAiBudget(
			record({ regenerationsLeft: 2 }),
			on(DECEMBER),
			"premium"
		);
		assert.deepEqual(budget.assignment, {
			premiumAccessKind: "premium",
			regenerationsLeft: 3
		});
		assert.equal(budget.regenerationsLeft, 5);
		assert.equal(budget.spend, "regeneration");
	});

	void it("never adds the quota again once the rewind used the AI", () => {
		const budget = resolveRewindAiBudget(
			premiumRecord({ regenerationsLeft: 2 }),
			on(DECEMBER),
			"premium"
		);
		assert.equal(budget.assignment, null);
		assert.equal(budget.regenerationsLeft, 2);
	});

	void it("announces the grace only while it can be used", () => {
		const graceOf = (today: Date, stored: RewindRecord) =>
			resolveRewindAiBudget(stored, on(today), "gift").graceEndsAt;
		assert.equal(graceOf(GRACE_FIRST_DAY, premiumRecord()), "2027-01-07");
		assert.equal(graceOf(GRACE_LAST_DAY, premiumRecord()), "2027-01-07");
		assert.equal(graceOf(AFTER_GRACE, premiumRecord()), null);
		assert.equal(graceOf(DECEMBER, premiumRecord()), null);
		assert.equal(
			graceOf(GRACE_FIRST_DAY, premiumRecord({ graceUsed: true })),
			null
		);
	});
});

void describe("resolveRewindAiUseChanges", () => {
	void it("writes the assigned quota minus the roll spent", () => {
		const budget = resolveRewindAiBudget(record(), on(DECEMBER), "premium");
		assert.deepEqual(resolveRewindAiUseChanges(record(), budget), {
			premiumAccessKind: "premium",
			regenerationsLeft: 2,
			graceUsed: false
		});
	});

	void it("keeps the rolls an admin gave before the first use on top of the quota", () => {
		const stored = record({ regenerationsLeft: 4 });
		const budget = resolveRewindAiBudget(stored, on(DECEMBER), "gift");
		assert.deepEqual(resolveRewindAiUseChanges(stored, budget), {
			premiumAccessKind: "gift",
			regenerationsLeft: 4,
			graceUsed: false
		});
	});

	void it("keeps the admin rolls and the quota when the grace is spent", () => {
		const stored = record({ regenerationsLeft: 2 });
		const budget = resolveRewindAiBudget(
			stored,
			on(GRACE_FIRST_DAY),
			"premium"
		);
		assert.deepEqual(resolveRewindAiUseChanges(stored, budget), {
			premiumAccessKind: "premium",
			regenerationsLeft: 5,
			graceUsed: true
		});
	});

	void it("marks the grace without touching the rolls", () => {
		const stored = premiumRecord({ regenerationsLeft: 1 });
		const budget = resolveRewindAiBudget(
			stored,
			on(GRACE_FIRST_DAY),
			"premium"
		);
		assert.deepEqual(resolveRewindAiUseChanges(stored, budget), {
			premiumAccessKind: "premium",
			regenerationsLeft: 1,
			graceUsed: true
		});
	});

	void it("assigns the quota even when nothing can be spent", () => {
		const budget = resolveRewindAiBudget(
			record(),
			calendarOn(DECEMBER, 2000, editionOf(2026)),
			"gift"
		);
		assert.deepEqual(resolveRewindAiUseChanges(record(), budget), {
			premiumAccessKind: "gift",
			regenerationsLeft: 0,
			graceUsed: false
		});
	});
});

void describe("resolveAiRecapState", () => {
	void it("maps the stored status and whether the AI can be used now", () => {
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
	void it("answers the full shape for an owner without access", () => {
		assert.deepEqual(
			buildRewindOwnerControls(record(), on(DECEMBER), null),
			{
				includesPrivateRuns: false,
				includesNotes: false,
				regenerationsLeft: 0,
				graceEndsAt: null,
				canRegenerate: false,
				regenerationBlockedBy: "no-ai-access",
				aiRecapState: "unavailable",
				periodOpen: true,
				periodStatus: "open",
				closesAt: "2027-01-31",
				frozenAt: null
			}
		);
	});

	void it("counts the rolls the access would give before the first use", () => {
		const controls = buildRewindOwnerControls(
			record(),
			on(DECEMBER),
			"premium"
		);
		assert.equal(controls.regenerationsLeft, 3);
		assert.equal(controls.canRegenerate, true);
		assert.equal(controls.aiRecapState, "available");
	});

	void it("counts the admin rolls plus the pending quota before the first use", () => {
		const stored = record({ regenerationsLeft: 2 });
		assert.equal(
			buildRewindOwnerControls(stored, on(DECEMBER), "gift")
				.regenerationsLeft,
			3
		);
		assert.equal(
			buildRewindOwnerControls(stored, on(DECEMBER), null)
				.regenerationsLeft,
			2
		);
	});

	void it("offers the grace with zero rolls and closes everything after the period", () => {
		const stored = premiumRecord({
			regenerationsLeft: 0,
			includesPrivateRuns: true,
			includesNotes: true
		});
		assert.deepEqual(
			buildRewindOwnerControls(stored, on(GRACE_FIRST_DAY), "premium"),
			{
				includesPrivateRuns: true,
				includesNotes: true,
				regenerationsLeft: 0,
				graceEndsAt: "2027-01-07",
				canRegenerate: true,
				regenerationBlockedBy: null,
				aiRecapState: "available",
				periodOpen: true,
				periodStatus: "open",
				closesAt: "2027-01-31",
				frozenAt: null
			}
		);

		const frozenAt = new Date("2027-02-01T00:05:00.000Z");
		assert.deepEqual(
			buildRewindOwnerControls(
				premiumRecord({ regenerationsLeft: 2, frozenAt }),
				on(AFTER_CLOSING),
				"premium"
			),
			{
				includesPrivateRuns: false,
				includesNotes: false,
				regenerationsLeft: 2,
				graceEndsAt: null,
				canRegenerate: false,
				regenerationBlockedBy: "period-closed",
				aiRecapState: "unavailable",
				periodOpen: false,
				periodStatus: "closed",
				closesAt: null,
				frozenAt: "2027-02-01T00:05:00.000Z"
			}
		);
	});

	void it("does not offer the AI with zero rolls outside the grace", () => {
		const controls = buildRewindOwnerControls(
			premiumRecord({ regenerationsLeft: 0 }),
			on(AFTER_GRACE),
			"premium"
		);
		assert.equal(controls.canRegenerate, false);
		assert.equal(controls.aiRecapState, "unavailable");
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
		includeNotes: false,
		writeAiRecap: true,
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
			{ ...valid, includeNotes: "true" },
			{ ...valid, includeNotes: 1 },
			{ ...valid, includeNotes: null },
			{ ...valid, notes: "my secret" },
			{ ...valid, writeAiRecap: "true" },
			{ ...valid, writeAiRecap: null },
			{
				language: "en",
				includePrivateRuns: false,
				includeNotes: false,
				expectedGeneratedAt: null
			},
			{
				language: "en",
				includePrivateRuns: true,
				expectedGeneratedAt: null
			},
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

void describe("AddRewindAiRecapSchema", () => {
	const valid = { includePrivateRuns: true, includeNotes: false };

	void it("accepts both privacy switches", () => {
		assert.equal(AddRewindAiRecapSchema.safeParse(valid).success, true);
	});

	void it("rejects missing, loose or extra fields", () => {
		const garbage = [
			{},
			{ includePrivateRuns: true },
			{ ...valid, includeNotes: "false" },
			{ ...valid, includePrivateRuns: 1 },
			{ ...valid, language: "en" },
			null
		];
		for (const body of garbage) {
			assert.equal(
				AddRewindAiRecapSchema.safeParse(body).success,
				false,
				JSON.stringify(body)
			);
		}
	});
});
