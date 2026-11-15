import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rewindViewToRewind } from "../../src/rewind/mappers/rewind-view-to-rewind.mapper";
import { type RewindOwner } from "../../src/rewind/rewind.interface";
import { type RewindViewSource } from "../../src/rewind/rewind-freeze.interface";
import { type RewindRecord } from "../../src/rewind/rewind-record.interface";
import { type RewindRun } from "../../src/rewind/rewind-run.interface";
import { buildRewindView } from "../../src/rewind/utils/build-rewind-view.util";
import { buildRewindYears } from "../../src/rewind/utils/build-rewind-years.util";
import { listVisibleRewindYears } from "../../src/rewind/utils/list-visible-rewind-years.util";
import { resolveClosedRewindEdition } from "../../src/rewind/utils/resolve-closed-rewind-edition.util";
import {
	calendarOn,
	editionOf,
	finishedRun,
	ownerVisibility,
	visitorVisibility
} from "./rewind-run.builder";

const OWNER: RewindOwner = {
	username: "ana",
	name: "Ana",
	avatarUrl: null,
	role: "user"
};

const AFTER_CLOSING = new Date("2027-02-05T00:00:00.000Z");
const FROZEN_AT = "2027-02-05T00:10:00.000Z";

function recordOf(overrides: Partial<RewindRecord> = {}): RewindRecord {
	return {
		year: 2026,
		language: "es",
		includesPrivateRuns: true,
		includesNotes: false,
		generatedAt: new Date("2026-12-02T10:00:00.000Z"),
		regenerationsLeft: 1,
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

function viewSource(
	runs: RewindRun[],
	overrides: Partial<RewindViewSource> = {}
): RewindViewSource {
	return {
		record: recordOf(),
		owner: OWNER,
		runs,
		genres: [],
		platinums: 2,
		previousYearPlatinums: 1,
		calendar: calendarOn(AFTER_CLOSING, 2020, editionOf(2026)),
		visibility: ownerVisibility([2026]),
		design: "2026",
		frozenAt: FROZEN_AT,
		requireListedYear: false,
		...overrides
	};
}

void describe("buildRewindView", () => {
	void it("carries the games with title, cover, platform and genres, the options and the freeze date", () => {
		const runs = [
			finishedRun("hades", "2026-03-10"),
			finishedRun("hades", "2026-08-01", {
				platform: { name: "PlayStation 5", abbreviation: "PS5" }
			}),
			finishedRun("celeste", "2026-05-02", { platform: null })
		];

		const view = buildRewindView(
			viewSource(runs, {
				genres: [
					{ gameId: "id-hades", code: "rogue", name: "Roguelike" },
					{ gameId: "id-hades", code: "rogue", name: "Roguelike" },
					{ gameId: "id-hades", code: "action", name: "Action" }
				]
			})
		);

		assert.ok(view);
		assert.deepEqual(
			view.finishedGames.map(game => ({
				title: game.title,
				coverUrl: game.coverUrl,
				platformName: game.platformName,
				genres: game.genres
			})),
			[
				{
					title: "CELESTE",
					coverUrl: "https://img.test/celeste.jpg",
					platformName: null,
					genres: []
				},
				{
					title: "HADES",
					coverUrl: "https://img.test/hades.jpg",
					platformName: "PlayStation 5",
					genres: ["Roguelike", "Action"]
				}
			]
		);
		assert.deepEqual(view.options, {
			includesPrivateRuns: true,
			includesNotes: false
		});
		assert.equal(view.design, "2026");
		assert.equal(view.frozenAt, FROZEN_AT);
		assert.equal(view.language, "es");
		assert.equal(view.totals.platinums, 2);
		assert.equal(view.totals.finished, 2);
	});

	void it("compares with the previous year only when that year exists", () => {
		const current = finishedRun("hades", "2026-03-10");
		const previous = finishedRun("celeste", "2025-04-04");

		const withPrevious = buildRewindView(viewSource([current, previous]));
		const withoutPrevious = buildRewindView(viewSource([current]));
		const beforeSignUp = buildRewindView(
			viewSource([current, previous], {
				calendar: calendarOn(AFTER_CLOSING, 2026, editionOf(2026))
			})
		);

		assert.equal(withPrevious?.previousYearTotals?.finished, 1);
		assert.equal(withPrevious?.previousYearTotals?.platinums, 1);
		assert.equal(withoutPrevious?.previousYearTotals, null);
		assert.equal(beforeSignUp?.previousYearTotals, null);
	});

	void it("has no public view for a year without visible runs, but always an owner view", () => {
		const visitorView = buildRewindView(
			viewSource([finishedRun("hades", "2025-03-10")], {
				visibility: visitorVisibility([2026]),
				requireListedYear: true
			})
		);
		const ownerView = buildRewindView(viewSource([]));

		assert.equal(visitorView, null);
		assert.equal(ownerView?.totals.finished, 0);
		assert.deepEqual(ownerView?.finishedGames, []);
	});

	void it("drops the AI recap that is not ready and keeps the access kind only with premium content", () => {
		const view = buildRewindView(
			viewSource([finishedRun("hades", "2026-03-10")], {
				record: recordOf({
					aiRecapStatus: "failed",
					premiumAccessKind: "gift"
				})
			})
		);

		assert.equal(view?.aiRecap, null);
		assert.equal(view?.premiumAccessKind, null);
	});
});

void describe("persona and covers of the view", () => {
	void it("stores the persona with and without platinums and the covers of the year card", () => {
		const runs = [
			finishedRun("hades", "2026-03-10", { userRating: 3 }),
			finishedRun("celeste", "2026-05-02", { userRating: 5 }),
			finishedRun("tunic", "2025-01-01", { userRating: 5 })
		];

		const view = buildRewindView(viewSource(runs, { platinums: 3 }));

		assert.equal(view?.persona, "trophy-hunter");
		assert.equal(view?.personaWithoutPlatinums, "steady-player");
		assert.deepEqual(
			view?.covers.map(cover => cover.title),
			["CELESTE", "HADES"]
		);
	});

	void it("keeps one persona when the platinums do not decide it", () => {
		const view = buildRewindView(
			viewSource([finishedRun("hades", "2026-03-10")], { platinums: 0 })
		);

		assert.equal(view?.persona, view?.personaWithoutPlatinums);
	});
});

void describe("rewindViewToRewind", () => {
	const view = buildRewindView(
		viewSource(
			[
				finishedRun("hades", "2026-03-10"),
				finishedRun("celeste", "2025-04-04")
			],
			{ platinums: 3 }
		)
	)!;
	const live = {
		user: { ...OWNER, name: "Ana María" },
		isSpotlight: false,
		otherYears: [2025],
		ownerControls: null,
		premiumAccess: null,
		platinumsVisible: true
	};

	void it("keeps the photo and takes the identity, navigation and controls live", () => {
		const rewind = rewindViewToRewind(view, live);

		assert.equal(rewind.user.name, "Ana María");
		assert.deepEqual(rewind.otherYears, [2025]);
		assert.equal(rewind.frozenAt, FROZEN_AT);
		assert.equal(rewind.design, "2026");
		assert.deepEqual(rewind.totals, view.totals);
		assert.deepEqual(Object.keys(rewind.finishedGames[0]!).sort(), [
			"backgroundUrl",
			"code",
			"coverUrl",
			"finishedAt",
			"gameId",
			"platformAbbreviation",
			"title"
		]);
		for (const key of [
			"previousYearTotals",
			"options",
			"covers",
			"personaWithoutPlatinums"
		])
			assert.equal(key in rewind, false);
	});

	void it("serves the persona and totals without platinums to a viewer without access to them", () => {
		const withAccess = rewindViewToRewind(view, live);
		const withoutAccess = rewindViewToRewind(view, {
			...live,
			platinumsVisible: false
		});

		assert.equal(withAccess.persona, "trophy-hunter");
		assert.equal(withAccess.totals.platinums, 3);
		assert.equal(withoutAccess.persona, view.personaWithoutPlatinums);
		assert.equal(withoutAccess.totals.platinums, null);
		assert.equal(withoutAccess.totals.finished, view.totals.finished);
		assert.equal(view.totals.platinums, 3);
	});
});

void describe("listing frozen years", () => {
	const runs = [
		finishedRun("hades", "2024-03-10"),
		finishedRun("celeste", "2025-05-02")
	];
	const calendar = calendarOn(AFTER_CLOSING, 2020, editionOf(2026));

	void it("lists a frozen year by its snapshot even without live runs, and hides one without a view", () => {
		const visibility = {
			...visitorVisibility([2024, 2025, 2026]),
			frozenYearListing: new Map([
				[2026, true],
				[2025, false]
			])
		};

		assert.deepEqual(
			listVisibleRewindYears(runs, calendar, visibility),
			[2026, 2024]
		);
	});

	void it("keeps live years live for the owner, generated or not", () => {
		const visibility = {
			...ownerVisibility([2026]),
			frozenYearListing: new Map([[2026, true]])
		};

		assert.deepEqual(
			listVisibleRewindYears(runs, calendar, visibility),
			[2026, 2025, 2024]
		);
	});

	void it("summarizes a frozen year from its snapshot and a live one from the runs", () => {
		const frozenView = buildRewindView(
			viewSource(
				[
					finishedRun("tunic", "2026-02-02"),
					finishedRun("gris", "2026-04-04")
				],
				{ platinums: 3 }
			)
		)!;
		const source = {
			runs,
			genres: [],
			platinumsByYear: new Map([[2025, null]]),
			calendar,
			visibility: {
				...visitorVisibility([2025, 2026]),
				frozenYearListing: new Map([[2026, true]])
			},
			frozenViews: new Map([[2026, frozenView]]),
			platinumsVisible: false
		};

		const { years } = buildRewindYears(source);
		const withPlatinums = buildRewindYears({
			...source,
			platinumsVisible: true
		});

		assert.deepEqual(
			years.map(summary => [
				summary.year,
				summary.finishedCount,
				summary.persona,
				summary.covers.map(cover => cover.title)
			]),
			[
				[
					2026,
					2,
					frozenView.personaWithoutPlatinums,
					["GRIS", "TUNIC"]
				],
				[2025, 1, "steady-player", ["CELESTE"]]
			]
		);
		assert.equal(withPlatinums.years[0]?.persona, "trophy-hunter");
	});
});

void describe("resolveClosedRewindEdition", () => {
	const edition = editionOf(2026);

	void it("is closed from 00:00 UTC of the day after closesAt", () => {
		const lastInstant = new Date("2027-01-31T23:59:59.999Z");
		const firstInstant = new Date("2027-02-01T00:00:00.000Z");

		assert.equal(
			resolveClosedRewindEdition({ today: lastInstant, edition }),
			null
		);
		assert.equal(
			resolveClosedRewindEdition({ today: firstInstant, edition }),
			edition
		);
	});

	void it("is never closed without an edition or while it is open", () => {
		assert.equal(
			resolveClosedRewindEdition({ today: AFTER_CLOSING, edition: null }),
			null
		);
		assert.equal(
			resolveClosedRewindEdition({
				today: new Date("2026-12-01T00:00:00.000Z"),
				edition
			}),
			null
		);
	});
});
