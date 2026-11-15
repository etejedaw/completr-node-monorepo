import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REWIND_CLASSIC_MIN_AGE_YEARS } from "../../src/rewind/rewind.constants";
import {
	type ClosedRewindRun,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { pickClassicGame } from "../../src/rewind/utils/pick-classic-game.util";
import { finishedRun } from "./rewind-run.builder";

const REWIND_YEAR = 2026;

function released(
	gameCode: string,
	releaseYear: number | null,
	finishedAt = "2026-05-05",
	overrides: Partial<RewindRun> = {}
): ClosedRewindRun {
	return finishedRun(gameCode, finishedAt, {
		releaseYear,
		...overrides
	}) as ClosedRewindRun;
}

void describe("pickClassicGame", () => {
	void it("is null without finished games", () => {
		assert.equal(pickClassicGame([], REWIND_YEAR), null);
	});

	void it("picks the oldest release and carries its cover, title, finish and release year", () => {
		const runs = [
			released("hades", 2020),
			released("doom", 1993, "2026-08-08"),
			released("zelda", 1998)
		];

		assert.deepEqual(pickClassicGame(runs, REWIND_YEAR), {
			gameId: "id-doom",
			code: "doom",
			title: "DOOM",
			coverUrl: "https://img.test/doom.jpg",
			backgroundUrl: "https://img.test/doom-bg.jpg",
			finishedAt: "2026-08-08",
			platformAbbreviation: "NSW",
			releaseYear: 1993
		});
	});

	void it("leaves out games without a release year", () => {
		const runs = [released("unknown", null), released("myst", 1993)];

		assert.equal(pickClassicGame(runs, REWIND_YEAR)?.code, "myst");
		assert.equal(
			pickClassicGame([released("unknown", null)], REWIND_YEAR),
			null
		);
	});

	void it("counts a game released exactly the minimum age ago and not one a year younger", () => {
		const limit = REWIND_YEAR - REWIND_CLASSIC_MIN_AGE_YEARS;

		assert.equal(
			pickClassicGame([released("edge", limit)], REWIND_YEAR)
				?.releaseYear,
			limit
		);
		assert.equal(
			pickClassicGame([released("young", limit + 1)], REWIND_YEAR),
			null
		);
	});

	void it("ignores release years after the Rewind year", () => {
		assert.equal(
			pickClassicGame([released("future", 2030)], REWIND_YEAR),
			null
		);
	});

	void it("breaks a release tie by the earliest finish", () => {
		const runs = [
			released("late", 1994, "2026-11-11"),
			released("early", 1994, "2026-02-02")
		];

		assert.equal(pickClassicGame(runs, REWIND_YEAR)?.code, "early");
	});

	void it("breaks a release and finish tie by the game id, whatever the input order", () => {
		const first = released("bravo", 1994);
		const second = released("alpha", 1994);

		assert.equal(
			pickClassicGame([first, second], REWIND_YEAR)?.code,
			"alpha"
		);
		assert.equal(
			pickClassicGame([second, first], REWIND_YEAR)?.code,
			"alpha"
		);
	});

	void it("measures the age against the Rewind year it is asked for", () => {
		const runs = [released("portal", 2007)];

		assert.equal(pickClassicGame(runs, 2017)?.code, "portal");
		assert.equal(pickClassicGame(runs, 2016), null);
	});
});
