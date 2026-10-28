import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type RewindOwner } from "../../src/rewind/rewind.interface";
import {
	type RewindGameGenre,
	type RewindRun
} from "../../src/rewind/rewind-run.interface";
import { buildRewind } from "../../src/rewind/utils/build-rewind.util";
import { buildRun, finishedRun } from "./rewind-run.builder";

const OWNER: RewindOwner = {
	username: "ana",
	name: "Ana",
	avatarUrl: null,
	role: "user"
};

const MID_2026 = new Date("2026-06-15T12:00:00.000Z");

function rewindOf(
	runs: RewindRun[],
	options: {
		year?: number;
		genres?: RewindGameGenre[];
		platinums?: number | null;
		today?: Date;
	} = {}
) {
	return buildRewind({
		year: options.year ?? 2025,
		owner: OWNER,
		runs,
		genres: options.genres ?? [],
		platinums: options.platinums === undefined ? 0 : options.platinums,
		today: options.today ?? MID_2026
	});
}

function genre(gameCode: string, code: string, name: string) {
	return { gameId: `id-${gameCode}`, code, name };
}

void describe("buildRewind", () => {
	void describe("header", () => {
		void it("carries the year, the owner and the other open years", () => {
			const runs = [
				finishedRun("a", "2023-01-01"),
				finishedRun("b", "2025-01-01"),
				buildRun("c", { status: "playing", startedAt: "2024-05-01" }),
				finishedRun("d", "2026-01-01")
			];

			const rewind = rewindOf(runs);

			assert.equal(rewind.year, 2025);
			assert.deepEqual(rewind.user, OWNER);
			assert.deepEqual(rewind.otherYears, [2024, 2023]);
		});

		void it("is in the spotlight only inside its own window", () => {
			const runs = [finishedRun("a", "2025-01-01")];

			assert.equal(
				rewindOf(runs, { today: new Date("2025-12-01T00:00:00Z") })
					.isSpotlight,
				true
			);
			assert.equal(
				rewindOf(runs, { today: new Date("2026-01-31T23:59:59Z") })
					.isSpotlight,
				true
			);
			assert.equal(
				rewindOf(runs, { today: new Date("2026-02-01T00:00:00Z") })
					.isSpotlight,
				false
			);
		});
	});

	void describe("totals", () => {
		void it("counts distinct finished, abandoned and started games", () => {
			const runs = [
				finishedRun("a", "2025-01-01", { startedAt: "2024-12-20" }),
				finishedRun("a", "2025-05-01", { startedAt: "2025-04-01" }),
				finishedRun("b", "2025-02-01", { startedAt: "2025-01-15" }),
				buildRun("c", {
					status: "abandoned",
					finishedAt: "2025-03-01",
					startedAt: "2025-02-01"
				}),
				buildRun("c", {
					status: "abandoned",
					finishedAt: "2025-08-01"
				}),
				buildRun("d", { status: "abandoned" }),
				buildRun("e", { status: "playing", startedAt: "2025-06-01" }),
				buildRun("f", { status: "endless", startedAt: "2025-07-01" }),
				finishedRun("g", "2024-12-31", { startedAt: "2024-12-01" })
			];

			const { totals } = rewindOf(runs);

			assert.equal(totals.finished, 2);
			assert.equal(totals.abandoned, 1);
			assert.equal(totals.started, 5);
		});

		void it("sums the real hours of finished and abandoned runs only", () => {
			const runs = [
				finishedRun("a", "2025-01-01", { realDuration: 10.04 }),
				finishedRun("a", "2025-02-01", { realDuration: 5 }),
				buildRun("b", {
					status: "abandoned",
					finishedAt: "2025-03-01",
					realDuration: 2.5
				}),
				finishedRun("c", "2025-04-01", { duration: 40 }),
				buildRun("d", {
					status: "playing",
					startedAt: "2025-01-01",
					realDuration: 99
				}),
				finishedRun("e", "2024-12-31", { realDuration: 99 })
			];

			assert.equal(rewindOf(runs).totals.hoursPlayed, 17.5);
		});

		void it("reports zero hours without data", () => {
			const runs = [
				buildRun("a", { status: "playing", startedAt: "2025-01-01" })
			];

			assert.equal(rewindOf(runs).totals.hoursPlayed, 0);
		});

		void it("passes the platinum count through, null included", () => {
			const runs = [finishedRun("a", "2025-01-01")];

			assert.equal(rewindOf(runs, { platinums: 3 }).totals.platinums, 3);
			assert.equal(
				rewindOf(runs, { platinums: null }).totals.platinums,
				null
			);
		});
	});

	void describe("finishedGames", () => {
		void it("lists each game once by its latest run, in chronological order", () => {
			const runs = [
				finishedRun("late", "2025-09-01"),
				finishedRun("twice", "2025-01-10", {
					platform: { name: "PC", abbreviation: "PC" }
				}),
				finishedRun("early", "2025-02-01", { platform: null }),
				finishedRun("twice", "2025-06-01")
			];

			const { finishedGames } = rewindOf(runs);

			assert.deepEqual(
				finishedGames.map(game => [game.code, game.finishedAt]),
				[
					["early", "2025-02-01"],
					["twice", "2025-06-01"],
					["late", "2025-09-01"]
				]
			);
			assert.equal(finishedGames[0]?.platformAbbreviation, null);
			assert.equal(finishedGames[1]?.platformAbbreviation, "NSW");
		});

		void it("breaks same-day ties by run id", () => {
			const first = finishedRun("zeta", "2025-05-05");
			const second = finishedRun("alpha", "2025-05-05");

			const { finishedGames } = rewindOf([second, first]);

			assert.deepEqual(
				finishedGames.map(game => game.code),
				["zeta", "alpha"]
			);
		});

		void it("leaves out abandoned runs and other years", () => {
			const runs = [
				buildRun("a", {
					status: "abandoned",
					finishedAt: "2025-01-01"
				}),
				finishedRun("b", "2024-12-31"),
				finishedRun("c", "2026-01-01")
			];

			assert.deepEqual(rewindOf(runs, { year: 2025 }).finishedGames, []);
		});
	});

	void describe("topRated", () => {
		void it("is null when no finished run has a rating", () => {
			const runs = [
				finishedRun("a", "2025-01-01"),
				buildRun("b", {
					status: "abandoned",
					finishedAt: "2025-01-02",
					userRating: 5
				})
			];

			assert.equal(rewindOf(runs).highlights.topRated, null);
		});

		void it("picks the highest rating, then the latest finish, then the run id", () => {
			const runs = [
				finishedRun("old", "2025-01-01", { userRating: 5 }),
				finishedRun("recent", "2025-08-01", { userRating: 5 }),
				finishedRun("low", "2025-12-01", { userRating: 4.5 })
			];

			const topRated = rewindOf(runs).highlights.topRated;

			assert.equal(topRated?.code, "recent");
			assert.equal(topRated?.userRating, 5);
			assert.equal(topRated?.finishedAt, "2025-08-01");

			const first = finishedRun("first", "2025-03-03", { userRating: 4 });
			const second = finishedRun("second", "2025-03-03", {
				userRating: 4
			});
			assert.equal(
				rewindOf([second, first]).highlights.topRated?.code,
				"first"
			);
		});
	});

	void describe("bestRatio", () => {
		void it("uses the personal ratio of score per real hour", () => {
			const runs = [
				finishedRun("long", "2025-01-01", {
					score: 4,
					realDuration: 40
				}),
				finishedRun("short", "2025-02-01", {
					score: 4,
					realDuration: 8
				}),
				finishedRun("estimate", "2025-03-01", {
					score: 5,
					duration: 1
				}),
				finishedRun("zero", "2025-04-01", { score: 5, realDuration: 0 })
			];

			const bestRatio = rewindOf(runs).highlights.bestRatio;

			assert.equal(bestRatio?.code, "short");
			assert.equal(bestRatio?.personalRatio, 10);
		});

		void it("is null without score or real hours", () => {
			const runs = [
				finishedRun("a", "2025-01-01", { realDuration: 10 }),
				finishedRun("b", "2025-01-02", { score: 4 })
			];

			assert.equal(rewindOf(runs).highlights.bestRatio, null);
		});

		void it("breaks ratio ties by the latest finish", () => {
			const runs = [
				finishedRun("early", "2025-01-01", {
					score: 4,
					realDuration: 10
				}),
				finishedRun("late", "2025-06-01", {
					score: 4,
					realDuration: 10
				})
			];

			assert.equal(rewindOf(runs).highlights.bestRatio?.code, "late");
		});
	});

	void describe("longest and fastest", () => {
		void it("uses real hours and falls back to the estimate", () => {
			const runs = [
				finishedRun("real", "2025-01-01", {
					realDuration: 30.04,
					duration: 99
				}),
				finishedRun("estimate", "2025-02-01", {
					realDuration: 0,
					duration: 2.5
				}),
				finishedRun("nothing", "2025-03-01")
			];

			const { longest, fastest } = rewindOf(runs).highlights;

			assert.equal(longest?.code, "real");
			assert.equal(longest?.hours, 30);
			assert.equal(longest?.isEstimate, false);
			assert.equal(fastest?.code, "estimate");
			assert.equal(fastest?.hours, 2.5);
			assert.equal(fastest?.isEstimate, true);
		});

		void it("hides fastest when it would be the same game as longest", () => {
			const single = [
				finishedRun("solo", "2025-01-01", { realDuration: 5 })
			];
			const twice = [
				finishedRun("again", "2025-01-01", { realDuration: 5 }),
				finishedRun("again", "2025-06-01", { realDuration: 15 })
			];

			assert.equal(rewindOf(single).highlights.longest?.code, "solo");
			assert.equal(rewindOf(single).highlights.fastest, null);
			assert.equal(rewindOf(twice).highlights.fastest, null);
		});

		void it("breaks hour ties by the earliest finish", () => {
			const runs = [
				finishedRun("b-late", "2025-06-01", { realDuration: 10 }),
				finishedRun("a-early", "2025-01-01", { realDuration: 10 }),
				finishedRun("quick", "2025-03-01", { realDuration: 1 })
			];

			const { longest, fastest } = rewindOf(runs).highlights;

			assert.equal(longest?.code, "a-early");
			assert.equal(fastest?.code, "quick");
		});

		void it("are null without any hours", () => {
			const { longest, fastest } = rewindOf([
				finishedRun("a", "2025-01-01")
			]).highlights;

			assert.equal(longest, null);
			assert.equal(fastest, null);
		});
	});

	void describe("favoriteGenre", () => {
		void it("counts distinct finished games per genre", () => {
			const runs = [
				finishedRun("a", "2025-01-01"),
				finishedRun("a", "2025-02-01"),
				finishedRun("b", "2025-03-01"),
				finishedRun("c", "2025-04-01"),
				buildRun("d", { status: "abandoned", finishedAt: "2025-05-01" })
			];
			const genres = [
				genre("a", "rpg", "RPG"),
				genre("b", "rpg", "RPG"),
				genre("c", "action", "Action"),
				genre("d", "action", "Action"),
				genre("d", "puzzle", "Puzzle")
			];

			assert.deepEqual(
				rewindOf(runs, { genres }).highlights.favoriteGenre,
				{
					code: "rpg",
					name: "RPG",
					count: 2
				}
			);
		});

		void it("breaks ties by name and is null without genres", () => {
			const runs = [
				finishedRun("a", "2025-01-01"),
				finishedRun("b", "2025-02-01")
			];
			const genres = [
				genre("a", "shooter", "Shooter"),
				genre("b", "adventure", "Adventure")
			];

			assert.equal(
				rewindOf(runs, { genres }).highlights.favoriteGenre?.code,
				"adventure"
			);
			assert.equal(rewindOf(runs).highlights.favoriteGenre, null);
		});

		void it("ignores duplicated genre rows for the same game", () => {
			const runs = [finishedRun("a", "2025-01-01")];
			const genres = [genre("a", "rpg", "RPG"), genre("a", "rpg", "RPG")];

			assert.equal(
				rewindOf(runs, { genres }).highlights.favoriteGenre?.count,
				1
			);
		});
	});

	void describe("topPlatform", () => {
		void it("counts finished runs per platform, ties by name", () => {
			const pc = { name: "PC", abbreviation: "PC" };
			const ps5 = { name: "PlayStation 5", abbreviation: "PS5" };
			const runs = [
				finishedRun("a", "2025-01-01", { platform: ps5 }),
				finishedRun("a", "2025-02-01", { platform: ps5 }),
				finishedRun("b", "2025-03-01", { platform: pc }),
				finishedRun("c", "2025-04-01", { platform: pc }),
				buildRun("d", {
					status: "abandoned",
					finishedAt: "2025-05-01",
					platform: pc
				})
			];

			assert.deepEqual(rewindOf(runs).highlights.topPlatform, {
				name: "PC",
				abbreviation: "PC",
				count: 2
			});
		});

		void it("is null without finished runs", () => {
			assert.equal(
				rewindOf([
					buildRun("a", {
						status: "playing",
						startedAt: "2025-01-01"
					})
				]).highlights.topPlatform,
				null
			);
		});
	});

	void describe("busiestMonth", () => {
		void it("counts finished games per month, ties by the earliest month", () => {
			const runs = [
				finishedRun("a", "2025-03-01"),
				finishedRun("b", "2025-03-31"),
				finishedRun("c", "2025-07-01"),
				finishedRun("d", "2025-07-15"),
				finishedRun("e", "2025-12-31")
			];

			assert.deepEqual(rewindOf(runs).highlights.busiestMonth, {
				month: 3,
				count: 2
			});
		});

		void it("counts a game finished twice in its latest month only", () => {
			const runs = [
				finishedRun("a", "2025-01-01"),
				finishedRun("b", "2025-01-02"),
				finishedRun("a", "2025-10-01"),
				finishedRun("c", "2025-10-02")
			];

			assert.deepEqual(rewindOf(runs).highlights.busiestMonth, {
				month: 10,
				count: 2
			});
		});

		void it("is null without finished games", () => {
			assert.equal(
				rewindOf([
					buildRun("a", {
						status: "playing",
						startedAt: "2025-01-01"
					})
				]).highlights.busiestMonth,
				null
			);
		});
	});
});
