import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindRecord } from "../../src/rewind/rewind-record.interface";
import { buildRewindOwnerControls } from "../../src/rewind/utils/build-rewind-owner-controls.util";
import { buildRewindYears } from "../../src/rewind/utils/build-rewind-years.util";
import { resolveRewindGenerationBlocker } from "../../src/rewind/utils/resolve-rewind-generation-blocker.util";
import { resolveRewindPeriod } from "../../src/rewind/utils/resolve-rewind-period.util";
import { resolveRewindRegenerationBlocker } from "../../src/rewind/utils/resolve-rewind-regeneration-blocker.util";
import { type RewindEditionRecord } from "../../src/rewind-editions/rewind-editions.interface";
import { resolveRewindEditionStatus } from "../../src/rewind-editions/utils/resolve-rewind-edition-status.util";
import {
	calendarOn,
	editionOf,
	finishedRun,
	ownerVisibility,
	visitorVisibility
} from "./rewind-run.builder";

const OPEN_DAY = new Date("2026-12-15T00:00:00.000Z");
const BEFORE_OPENING = new Date("2026-11-30T23:59:59.999Z");
const CLOSING_DAY = new Date("2027-01-31T23:59:59.999Z");
const AFTER_CLOSING = new Date("2027-02-01T00:00:00.000Z");

const edition2026 = editionOf(2026);
const edition2027 = editionOf(2027);

function period(
	today: Date,
	edition: RewindEditionRecord | null = edition2026,
	upcomingEdition: RewindEditionRecord | null = edition2027
) {
	return resolveRewindPeriod(
		calendarOn(today, 2000, edition, upcomingEdition)
	);
}

void describe("resolveRewindPeriod", () => {
	void it("is null when no edition exists", () => {
		assert.equal(
			resolveRewindPeriod(calendarOn(OPEN_DAY, 2000, null, null)),
			null
		);
	});

	void it("is open from the first to the last millisecond of the period", () => {
		const expected = {
			status: "open",
			year: 2026,
			opensAt: "2026-12-01",
			closesAt: "2027-01-31"
		};
		assert.deepEqual(period(OPEN_DAY), expected);
		assert.deepEqual(period(CLOSING_DAY), expected);
	});

	void it("prefers the open edition over a later scheduled one", () => {
		assert.equal(period(OPEN_DAY)?.year, 2026);
	});

	void it("is scheduled with the next edition when none is open", () => {
		const scheduled = resolveRewindPeriod(
			calendarOn(BEFORE_OPENING, 2000, null, edition2026)
		);
		assert.deepEqual(scheduled, {
			status: "scheduled",
			year: 2026,
			opensAt: "2026-12-01",
			closesAt: "2027-01-31"
		});
	});

	void it("is scheduled with the next edition even if an earlier one already closed", () => {
		const scheduled = resolveRewindPeriod(
			calendarOn(AFTER_CLOSING, 2000, edition2026, edition2027)
		);
		assert.equal(scheduled?.status, "scheduled");
		assert.equal(scheduled?.year, 2027);
	});

	void it("is closed with the last edition when nothing is coming", () => {
		assert.deepEqual(period(AFTER_CLOSING, edition2026, null), {
			status: "closed",
			year: 2026,
			opensAt: "2026-12-01",
			closesAt: "2027-01-31"
		});
	});
});

void describe("resolveRewindGenerationBlocker", () => {
	const open = calendarOn(OPEN_DAY, 2000, edition2026);

	void it("blocks every year with period-closed when no period is open", () => {
		for (const calendar of [
			calendarOn(AFTER_CLOSING, 2000, edition2026),
			calendarOn(BEFORE_OPENING, 2000, null),
			calendarOn(OPEN_DAY, 2000, null)
		])
			assert.equal(
				resolveRewindGenerationBlocker(2026, calendar, "premium"),
				"period-closed"
			);
	});

	void it("lets everybody generate the year of the open edition", () => {
		for (const accessKind of [null, "gift", "premium"] as const)
			assert.equal(
				resolveRewindGenerationBlocker(2026, open, accessKind),
				null
			);
	});

	void it("requires full premium for the years before the open edition", () => {
		assert.equal(
			resolveRewindGenerationBlocker(2025, open, null),
			"requires-premium"
		);
		assert.equal(
			resolveRewindGenerationBlocker(2025, open, "gift"),
			"requires-premium"
		);
		assert.equal(
			resolveRewindGenerationBlocker(2025, open, "premium"),
			null
		);
	});
});

void describe("buildRewindYears generationBlockedBy", () => {
	const runs = [
		finishedRun("hades", "2025-03-01"),
		finishedRun("tunic", "2026-12-05")
	];

	function blockers(
		today: Date,
		accessKind: "premium" | "gift" | null,
		options: { visitor?: boolean; generated?: number[] } = {}
	) {
		const result = buildRewindYears({
			runs,
			calendar: calendarOn(today, 2000, edition2026),
			genres: [],
			platinumsByYear: new Map(),
			visibility: options.visitor
				? visitorVisibility(options.generated ?? [2025, 2026])
				: ownerVisibility(options.generated ?? []),
			generationAccess: options.visitor ? null : { accessKind }
		});
		return Object.fromEntries(
			result.years.map(summary => [
				summary.year,
				summary.generationBlockedBy
			])
		);
	}

	void it("blocks only the previous year for an owner without full premium", () => {
		assert.deepEqual(blockers(OPEN_DAY, null), {
			2026: null,
			2025: "requires-premium"
		});
		assert.deepEqual(blockers(OPEN_DAY, "gift"), {
			2026: null,
			2025: "requires-premium"
		});
	});

	void it("blocks nothing for an owner with full premium during the period", () => {
		assert.deepEqual(blockers(OPEN_DAY, "premium"), {
			2026: null,
			2025: null
		});
	});

	void it("blocks every ungenerated year with period-closed after the period", () => {
		assert.deepEqual(blockers(AFTER_CLOSING, "premium"), {
			2026: "period-closed",
			2025: "period-closed"
		});
	});

	void it("leaves generated years unblocked even when the period is closed", () => {
		assert.deepEqual(blockers(AFTER_CLOSING, null, { generated: [2026] }), {
			2026: null,
			2025: "period-closed"
		});
	});

	void it("is always null for visitors", () => {
		assert.deepEqual(blockers(AFTER_CLOSING, null, { visitor: true }), {
			2026: null,
			2025: null
		});
		assert.deepEqual(
			blockers(OPEN_DAY, null, { visitor: true, generated: [2026] }),
			{ 2026: null }
		);
	});
});

void describe("owner controls periodStatus", () => {
	const record: RewindRecord = {
		year: 2026,
		language: "en",
		includesPrivateRuns: false,
		includesNotes: false,
		generatedAt: new Date("2026-12-02T00:00:00.000Z"),
		regenerationsLeft: 0,
		graceUsed: false,
		aiRecap: null,
		aiRecapStatus: "none",
		aiRecapRequestedAt: null,
		premiumStats: null,
		premiumAccessKind: null,
		frozenAt: null
	};

	function statusOn(
		today: Date,
		edition: RewindEditionRecord | null,
		upcomingEdition: RewindEditionRecord | null = null
	) {
		return buildRewindOwnerControls(
			record,
			calendarOn(today, 2000, edition, upcomingEdition),
			null
		).periodStatus;
	}

	void it("follows the same criterion as the period of the list", () => {
		assert.equal(statusOn(OPEN_DAY, edition2026), "open");
		assert.equal(statusOn(AFTER_CLOSING, edition2026), "closed");
		assert.equal(statusOn(BEFORE_OPENING, null, edition2026), "scheduled");
		assert.equal(statusOn(OPEN_DAY, null), "closed");
	});
});

void describe("resolveRewindEditionStatus", () => {
	void it("is scheduled until the opening day, open through the closing day and closed after", () => {
		assert.equal(
			resolveRewindEditionStatus(edition2026, BEFORE_OPENING),
			"scheduled"
		);
		assert.equal(resolveRewindEditionStatus(edition2026, OPEN_DAY), "open");
		assert.equal(
			resolveRewindEditionStatus(edition2026, CLOSING_DAY),
			"open"
		);
		assert.equal(
			resolveRewindEditionStatus(edition2026, AFTER_CLOSING),
			"closed"
		);
	});
});

void describe("resolveRewindRegenerationBlocker", () => {
	const open = calendarOn(OPEN_DAY, 2000, edition2026);
	const closed = calendarOn(AFTER_CLOSING, 2000, edition2026);
	const withRolls = { spend: "regeneration" } as const;
	const noRolls = { spend: null } as const;

	void it("is null when a spend is available", () => {
		assert.equal(
			resolveRewindRegenerationBlocker(2026, open, "premium", withRolls),
			null
		);
	});

	void it("answers period-closed first, even without access or rolls", () => {
		assert.equal(
			resolveRewindRegenerationBlocker(2026, closed, null, noRolls),
			"period-closed"
		);
	});

	void it("answers requires-premium before the missing access", () => {
		assert.equal(
			resolveRewindRegenerationBlocker(2025, open, null, noRolls),
			"requires-premium"
		);
		assert.equal(
			resolveRewindRegenerationBlocker(2025, open, "gift", noRolls),
			"requires-premium"
		);
	});

	void it("answers no-ai-access before the missing rolls", () => {
		assert.equal(
			resolveRewindRegenerationBlocker(2026, open, null, noRolls),
			"no-ai-access"
		);
	});

	void it("answers no-regenerations-left when only the rolls are missing", () => {
		assert.equal(
			resolveRewindRegenerationBlocker(2026, open, "gift", noRolls),
			"no-regenerations-left"
		);
	});
});
