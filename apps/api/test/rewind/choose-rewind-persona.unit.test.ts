import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindTotals } from "../../src/rewind/rewind.interface";
import { type RewindPersonaStats } from "../../src/rewind/rewind-build.interface";
import { chooseRewindPersona } from "../../src/rewind/utils/choose-rewind-persona.util";

const QUIET_YEAR: RewindTotals = {
	finished: 0,
	abandoned: 0,
	started: 0,
	hoursPlayed: 0,
	platinums: 0,
	finishRate: null,
	averageRating: null,
	genresPlayed: 0,
	platformsPlayed: 0
};

function personaFor(
	totals: Partial<RewindTotals>,
	averageFinishedHours: number | null = null
) {
	const stats: RewindPersonaStats = {
		totals: { ...QUIET_YEAR, ...totals },
		averageFinishedHours
	};
	return chooseRewindPersona(stats);
}

void describe("chooseRewindPersona", () => {
	void describe("trophy-hunter", () => {
		void it("needs at least three platinums", () => {
			assert.equal(personaFor({ platinums: 3 }), "trophy-hunter");
			assert.equal(personaFor({ platinums: 2 }), "steady-player");
		});

		void it("never applies when the viewer can't see platinums", () => {
			assert.equal(
				personaFor({ platinums: null, finished: 3 }, 40),
				"marathoner"
			);
			assert.equal(personaFor({ platinums: null }), "steady-player");
		});

		void it("wins over every other persona", () => {
			assert.equal(
				personaFor(
					{
						platinums: 5,
						finished: 12,
						finishRate: 100,
						genresPlayed: 9
					},
					40
				),
				"trophy-hunter"
			);
		});
	});

	void describe("marathoner", () => {
		void it("needs three finished games averaging 30 hours or more", () => {
			assert.equal(personaFor({ finished: 3 }, 30), "marathoner");
			assert.equal(personaFor({ finished: 3 }, 29.9), "steady-player");
			assert.equal(personaFor({ finished: 2 }, 80), "steady-player");
		});

		void it("is not chosen without hours", () => {
			assert.equal(personaFor({ finished: 8 }, null), "steady-player");
		});

		void it("wins over finisher and genre-explorer", () => {
			assert.equal(
				personaFor(
					{ finished: 10, finishRate: 100, genresPlayed: 8 },
					45
				),
				"marathoner"
			);
		});
	});

	void describe("short-and-sweet", () => {
		void it("needs five finished games averaging 8 hours or less", () => {
			assert.equal(personaFor({ finished: 5 }, 8), "short-and-sweet");
			assert.equal(personaFor({ finished: 5 }, 8.1), "steady-player");
			assert.equal(personaFor({ finished: 4 }, 2), "steady-player");
		});

		void it("is not chosen without hours", () => {
			assert.equal(personaFor({ finished: 9 }, null), "steady-player");
		});

		void it("wins over finisher, genre-explorer and picky-player", () => {
			assert.equal(
				personaFor(
					{ finished: 10, finishRate: 100, genresPlayed: 8 },
					5
				),
				"short-and-sweet"
			);
		});
	});

	void describe("finisher", () => {
		void it("needs ten finished games and a finish rate of 80 or more", () => {
			assert.equal(
				personaFor({ finished: 10, abandoned: 2, finishRate: 83 }, 15),
				"finisher"
			);
			assert.equal(
				personaFor({ finished: 12, abandoned: 3, finishRate: 80 }),
				"finisher"
			);
			assert.equal(
				personaFor({ finished: 12, abandoned: 4, finishRate: 75 }),
				"steady-player"
			);
			assert.equal(
				personaFor({ finished: 9, finishRate: 100 }),
				"steady-player"
			);
		});

		void it("wins over genre-explorer", () => {
			assert.equal(
				personaFor({ finished: 10, finishRate: 100, genresPlayed: 7 }),
				"finisher"
			);
		});
	});

	void describe("genre-explorer", () => {
		void it("needs six distinct genres", () => {
			assert.equal(
				personaFor({ finished: 3, genresPlayed: 6 }),
				"genre-explorer"
			);
			assert.equal(
				personaFor({ finished: 3, genresPlayed: 5 }),
				"steady-player"
			);
		});

		void it("wins over picky-player", () => {
			assert.equal(
				personaFor({ finished: 2, abandoned: 5, genresPlayed: 6 }),
				"genre-explorer"
			);
		});
	});

	void describe("picky-player", () => {
		void it("needs more abandoned than finished and at least three abandoned", () => {
			assert.equal(
				personaFor({ finished: 2, abandoned: 3 }),
				"picky-player"
			);
			assert.equal(
				personaFor({ finished: 0, abandoned: 3 }),
				"picky-player"
			);
			assert.equal(
				personaFor({ finished: 3, abandoned: 3 }),
				"steady-player"
			);
			assert.equal(
				personaFor({ finished: 0, abandoned: 2 }),
				"steady-player"
			);
		});
	});

	void describe("steady-player", () => {
		void it("is the fallback, also for a year with nothing finished", () => {
			assert.equal(personaFor({}), "steady-player");
			assert.equal(personaFor({ started: 9 }), "steady-player");
			assert.equal(
				personaFor({ finished: 4, abandoned: 1, finishRate: 80 }, 12),
				"steady-player"
			);
		});
	});
});
