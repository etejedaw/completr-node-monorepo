import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildRewindRecapContent,
	condenseRecapNote,
	REWIND_RECAP_GAME_COLUMNS,
	REWIND_RECAP_MAX_GAME_ROWS,
	REWIND_RECAP_NOTE_MAX_LENGTH
} from "../../src/rewind-recap/utils/build-rewind-recap-content.util";
import { buildRun, finishedRun } from "../rewind/rewind-run.builder";
import {
	buildRecapInput,
	buildRecapRewind,
	buildTotals,
	franchiseOf,
	genreOf,
	RECAP_YEAR,
	TODAY
} from "./rewind-recap.fixtures";

type GameCell = string | number | boolean | null;

interface RecapContent {
	year: number;
	persona: string;
	totals: Record<string, unknown>;
	highlights: Record<string, unknown>;
	previousYear: Record<string, unknown> | null;
	games: {
		columns: string[];
		rows: GameCell[][];
		total: number;
		included: number;
		truncated: boolean;
	};
}

function readContent(
	...args: Parameters<typeof buildRewindRecapContent>
): RecapContent {
	return JSON.parse(buildRewindRecapContent(...args)) as RecapContent;
}

function column(content: RecapContent, name: string): GameCell[] {
	const index = content.games.columns.indexOf(name);
	return content.games.rows.map(row => row[index] ?? null);
}

void describe("buildRewindRecapContent", () => {
	void it("describes an empty year without inventing rows", () => {
		const content = readContent(buildRecapInput([]), TODAY);

		assert.equal(content.year, RECAP_YEAR);
		assert.equal(content.persona, "steady-player");
		assert.equal(content.previousYear, null);
		assert.deepEqual(content.games, {
			columns: [...REWIND_RECAP_GAME_COLUMNS],
			rows: [],
			total: 0,
			included: 0,
			truncated: false
		});
	});

	void it("serializes a single run as one row in column order without ids or urls", () => {
		const run = finishedRun("hades", "2026-03-10", {
			startedAt: "2026-02-01",
			realDuration: 42.5,
			duration: 25,
			userRating: 4.5,
			score: 4.6,
			platform: { name: "PlayStation 5", abbreviation: "PS5" }
		});
		const input = buildRecapInput([run], {
			genres: [
				genreOf("hades", "action", "Action"),
				genreOf("hades", "rpg", "RPG"),
				genreOf("hades", "rpg", "RPG")
			]
		});

		const serialized = buildRewindRecapContent(input, TODAY);
		const content = JSON.parse(serialized) as RecapContent;

		assert.deepEqual(content.games.rows, [
			[
				"HADES",
				"completed",
				"2026-02-01",
				"2026-03-10",
				"PS5",
				"Action/RPG",
				null,
				42.5,
				25,
				1.7,
				4.5,
				4.6,
				-0.1,
				31,
				37
			]
		]);
		assert.doesNotMatch(serialized, /id-hades|img\.test|run-\d+/);
	});

	void it("keeps real and estimated hours apart and leaves unknown values as null", () => {
		const estimated = finishedRun("celeste", "2026-05-01", {
			duration: 8,
			platform: null
		});
		const unknown = finishedRun("tetris", "2026-06-01");

		const content = readContent(
			buildRecapInput([estimated, unknown]),
			TODAY
		);

		assert.deepEqual(column(content, "realHours"), [null, null]);
		assert.deepEqual(column(content, "estimatedHours"), [8, null]);
		assert.deepEqual(column(content, "paceVsEstimate"), [null, null]);
		assert.deepEqual(column(content, "franchise"), [null, null]);
		assert.deepEqual(column(content, "daysInBacklog"), [null, null]);
		assert.deepEqual(column(content, "platform"), [null, "NSW"]);
		assert.deepEqual(column(content, "genres"), [null, null]);
		assert.deepEqual(column(content, "userRating"), [null, null]);
		assert.deepEqual(column(content, "criticScore"), [null, null]);
	});

	void it("keeps runs from earlier years still being played and drops stale ones", () => {
		const runs = [
			buildRun("still-playing", {
				status: "playing",
				startedAt: "2024-05-01"
			}),
			buildRun("forever", { status: "endless", startedAt: "2023-01-01" }),
			buildRun("parked", {
				status: "not_started",
				startedAt: "2025-03-01"
			}),
			buildRun("dropped-last-year", {
				status: "abandoned",
				startedAt: "2025-02-01",
				finishedAt: "2025-12-31"
			}),
			buildRun("carried-over", {
				status: "completed",
				startedAt: "2025-11-20",
				finishedAt: "2026-01-01"
			})
		];

		const content = readContent(buildRecapInput(runs), TODAY);

		assert.deepEqual(column(content, "title"), [
			"FOREVER",
			"STILL-PLAYING",
			"CARRIED-OVER"
		]);
	});

	void it("drops runs outside the year and undated runs", () => {
		const runs = [
			finishedRun("old", "2025-06-01", { startedAt: "2025-01-01" }),
			finishedRun("future", "2027-01-02", { startedAt: "2027-01-01" }),
			buildRun("starts-next-year", {
				status: "playing",
				startedAt: "2027-01-03"
			}),
			buildRun("undated", { status: "playing" }),
			buildRun("not-started-undated", { status: "not_started" }),
			buildRun("in-year", {
				status: "not_started",
				startedAt: "2026-12-31"
			})
		];

		const content = readContent(buildRecapInput(runs), TODAY);

		assert.deepEqual(column(content, "title"), ["IN-YEAR"]);
		assert.equal(content.games.total, 1);
	});

	void it("uses the given day as the end of a run still in progress", () => {
		const run = buildRun("began-last-year", {
			status: "playing",
			startedAt: "2025-04-01"
		});

		const before = readContent(
			buildRecapInput([run]),
			new Date("2025-12-01T00:00:00.000Z")
		);
		const during = readContent(buildRecapInput([run]), TODAY);

		assert.equal(before.games.total, 0);
		assert.equal(during.games.total, 1);
	});

	void it("caps the table at 200 rows giving priority to games closed in the year", () => {
		const closed = Array.from({ length: 150 }, (_, index) =>
			finishedRun(
				`closed-${index}`,
				`2026-${String((index % 12) + 1).padStart(2, "0")}-15`,
				{
					status: index % 5 === 0 ? "abandoned" : "completed",
					startedAt: "2026-01-01"
				}
			)
		);
		const ongoing = Array.from({ length: 100 }, (_, index) =>
			buildRun(`ongoing-${index}`, {
				status: "playing",
				startedAt: `2026-${String((index % 12) + 1).padStart(2, "0")}-01`
			})
		);

		const content = readContent(
			buildRecapInput([...ongoing, ...closed]),
			TODAY
		);

		assert.equal(content.games.total, 250);
		assert.equal(content.games.included, REWIND_RECAP_MAX_GAME_ROWS);
		assert.equal(content.games.rows.length, REWIND_RECAP_MAX_GAME_ROWS);
		assert.equal(content.games.truncated, true);
		const titles = column(content, "title") as string[];
		assert.equal(
			titles.filter(title => title.startsWith("CLOSED")).length,
			150
		);
		assert.equal(
			titles.filter(title => title.startsWith("ONGOING")).length,
			50
		);
		const ongoingStarts = content.games.rows
			.filter(row => String(row[0]).startsWith("ONGOING"))
			.map(row => String(row[2]));
		assert.ok(ongoingStarts.every(start => start >= "2026-06-01"));
	});

	void it("keeps the most recently closed games when closed games alone exceed the cap", () => {
		const closed = Array.from({ length: 250 }, (_, index) => {
			const day = new Date(Date.UTC(2026, 0, 1) + index * 86_400_000);
			return finishedRun(`g-${index}`, day.toISOString().slice(0, 10));
		});

		const content = readContent(buildRecapInput(closed), TODAY);

		const finishedDates = column(content, "finishedAt") as string[];
		assert.equal(finishedDates.length, REWIND_RECAP_MAX_GAME_ROWS);
		assert.equal(finishedDates[0], "2026-02-20");
		assert.equal(finishedDates.at(-1), "2026-09-07");
	});

	void it("lists rows in chronological order", () => {
		const runs = [
			finishedRun("late", "2026-11-01", { startedAt: "2026-10-01" }),
			finishedRun("early", "2026-02-01", { startedAt: "2026-01-05" }),
			buildRun("middle", { status: "playing", startedAt: "2026-06-01" }),
			finishedRun("undated-start", "2026-03-01")
		];

		const content = readContent(buildRecapInput(runs), TODAY);

		assert.deepEqual(column(content, "title"), [
			"EARLY",
			"UNDATED-START",
			"MIDDLE",
			"LATE"
		]);
	});

	void it("keeps quotes, emoji, HTML and newlines in titles as valid JSON", () => {
		const title =
			'He said "hi" 🎮 <script>alert(1)</script>\nLine 2 \\ end';
		const run = finishedRun("weird", "2026-04-01");
		run.game = { ...run.game, title };

		const serialized = buildRewindRecapContent(
			buildRecapInput([run], {
				genres: [genreOf("weird", "odd", 'Genre "/" <b>')]
			}),
			TODAY
		);
		const content = JSON.parse(serialized) as RecapContent;

		assert.equal(column(content, "title")[0], title);
		assert.equal(column(content, "genres")[0], 'Genre "/" <b>');
		assert.doesNotMatch(serialized, /\n/);
	});

	void it("reduces highlights to titles and values", () => {
		const gameRef = {
			gameId: "id-hades",
			code: "hades",
			title: "Hades",
			coverUrl: "https://img.test/hades.jpg",
			backgroundUrl: "https://img.test/hades-bg.jpg"
		};
		const finished = {
			...gameRef,
			finishedAt: "2026-03-10",
			platformAbbreviation: "PS5"
		};
		const rewind = buildRecapRewind({
			persona: "marathoner",
			totals: buildTotals({ finished: 1, hoursPlayed: 42.5 }),
			highlights: {
				topRated: { ...finished, userRating: 5 },
				bestRatio: { ...finished, personalRatio: 0.2 },
				longest: { ...finished, hours: 42.5, isEstimate: false },
				fastest: { ...finished, hours: 3, isEstimate: true },
				favoriteGenre: { code: "rpg", name: "RPG", count: 1 },
				topPlatform: {
					name: "PlayStation 5",
					abbreviation: "PS5",
					count: 1
				},
				busiestMonth: { month: 3, count: 1 },
				firstFinished: finished,
				lastFinished: finished,
				topGenres: [{ code: "rpg", name: "RPG", count: 1 }],
				topPlatforms: [
					{ name: "PlayStation 5", abbreviation: "PS5", count: 1 }
				],
				longestStreak: { months: 1, fromMonth: 3, toMonth: 3 }
			}
		});

		const serialized = buildRewindRecapContent(
			buildRecapInput([], { rewind }),
			TODAY
		);
		const content = JSON.parse(serialized) as RecapContent;

		assert.equal(content.persona, "marathoner");
		assert.deepEqual(content.totals, rewind.totals);
		assert.deepEqual(content.highlights, {
			topRated: { title: "Hades", userRating: 5 },
			bestRatio: { title: "Hades", personalRatio: 0.2 },
			longest: { title: "Hades", hours: 42.5, hoursEstimated: false },
			fastest: { title: "Hades", hours: 3, hoursEstimated: true },
			favoriteGenre: { name: "RPG", count: 1 },
			topPlatform: {
				name: "PlayStation 5",
				abbreviation: "PS5",
				count: 1
			},
			busiestMonth: { month: 3, count: 1 },
			firstFinished: { title: "Hades", finishedAt: "2026-03-10" },
			lastFinished: { title: "Hades", finishedAt: "2026-03-10" },
			topGenres: [{ name: "RPG", count: 1 }],
			topPlatforms: [
				{ name: "PlayStation 5", abbreviation: "PS5", count: 1 }
			],
			longestStreak: { months: 1, fromMonth: 3, toMonth: 3 }
		});
		assert.doesNotMatch(serialized, /img\.test|id-hades|avatar|player/);
	});

	void it("includes the previous year totals when there are some", () => {
		const previousYearTotals = buildTotals({
			finished: 7,
			hoursPlayed: 80
		});

		const content = readContent(
			buildRecapInput([], { previousYearTotals }),
			TODAY
		);

		assert.deepEqual(content.previousYear, previousYearTotals);
	});

	void it("divides real by estimated hours and refuses to divide by zero or nothing", () => {
		const runs = [
			finishedRun("slow", "2026-02-01", {
				realDuration: 10,
				duration: 3
			}),
			finishedRun("fast", "2026-02-02", {
				realDuration: 5,
				duration: 10
			}),
			finishedRun("zero-estimate", "2026-02-03", {
				realDuration: 5,
				duration: 0
			}),
			finishedRun("zero-real", "2026-02-04", {
				realDuration: 0,
				duration: 10
			}),
			finishedRun("no-estimate", "2026-02-05", { realDuration: 5 }),
			finishedRun("negative", "2026-02-06", {
				realDuration: -4,
				duration: 10
			})
		];

		const content = readContent(buildRecapInput(runs), TODAY);

		assert.deepEqual(column(content, "paceVsEstimate"), [
			3.33,
			0.5,
			null,
			null,
			null,
			null
		]);
		assert.deepEqual(column(content, "realHours"), [10, 5, 5, 0, 5, -4]);
		assert.deepEqual(column(content, "estimatedHours"), [
			3,
			10,
			0,
			10,
			null,
			10
		]);
	});

	void it("counts the days in the backlog and leaves them null when the game was added after it started", () => {
		const runs = [
			finishedRun("waited", "2026-06-01", {
				createdAt: "2026-01-10",
				startedAt: "2026-03-01"
			}),
			finishedRun("same-day", "2026-06-02", {
				createdAt: "2026-04-01T22:30:00.000Z",
				startedAt: "2026-04-01"
			}),
			finishedRun("logged-later", "2026-06-03", {
				createdAt: "2026-05-20",
				startedAt: "2026-05-01"
			}),
			finishedRun("never-started", "2026-06-04", {
				createdAt: "2026-01-01"
			}),
			finishedRun("waited-years", "2026-06-05", {
				createdAt: "2023-06-05",
				startedAt: "2026-06-04"
			})
		];

		const content = readContent(buildRecapInput(runs), TODAY);

		assert.deepEqual(column(content, "title"), [
			"WAITED",
			"SAME-DAY",
			"LOGGED-LATER",
			"NEVER-STARTED",
			"WAITED-YEARS"
		]);
		assert.deepEqual(column(content, "daysInBacklog"), [
			50,
			0,
			null,
			null,
			1095
		]);
	});

	void it("names the franchise of each game and joins several with a slash", () => {
		const runs = [
			finishedRun("zelda", "2026-02-01"),
			finishedRun("crossover", "2026-02-02"),
			finishedRun("standalone", "2026-02-03")
		];

		const content = readContent(
			buildRecapInput(runs, {
				franchises: [
					franchiseOf("zelda", "The Legend of Zelda"),
					franchiseOf("crossover", "Mario"),
					franchiseOf("crossover", "Sonic"),
					franchiseOf("crossover", "Mario")
				]
			}),
			TODAY
		);

		assert.deepEqual(column(content, "franchise"), [
			"The Legend of Zelda",
			"Mario/Sonic",
			null
		]);
	});

	void it("leaves the notes column out entirely unless the player opted in", () => {
		const run = finishedRun("journal", "2026-03-01", {
			notes: "Played it with my sister Ana every Sunday"
		});

		const serialized = buildRewindRecapContent(
			buildRecapInput([run]),
			TODAY
		);
		const content = JSON.parse(serialized) as RecapContent;

		assert.equal(content.games.columns.includes("notes"), false);
		assert.equal(
			content.games.rows[0]?.length,
			REWIND_RECAP_GAME_COLUMNS.length
		);
		assert.doesNotMatch(serialized, /sister|Ana|Sunday/);
	});

	void it("adds the condensed notes as the last column when the player opted in", () => {
		const html = "<b>loved</b> the <script>alert(1)</script> ending";
		const runs = [
			finishedRun("html", "2026-03-01", { notes: html }),
			finishedRun("spaced", "2026-03-02", {
				notes: "  first line\n\n\tsecond\r\nthird   "
			}),
			finishedRun("blank", "2026-03-03", { notes: " \n\t " }),
			finishedRun("none", "2026-03-04")
		];

		const serialized = buildRewindRecapContent(
			buildRecapInput(runs, { includesNotes: true }),
			TODAY
		);
		const content = JSON.parse(serialized) as RecapContent;

		assert.equal(content.games.columns.at(-1), "notes");
		assert.deepEqual(column(content, "notes"), [
			html,
			"first line second third",
			null,
			null
		]);
		assert.doesNotMatch(serialized, /\n/);
	});

	void it("cuts very long notes at 300 characters without splitting an emoji", () => {
		assert.equal(condenseRecapNote(null), null);
		assert.equal(condenseRecapNote(""), null);
		assert.equal(condenseRecapNote("x".repeat(5000)), "x".repeat(300));
		assert.equal(REWIND_RECAP_NOTE_MAX_LENGTH, 300);

		const emojiNote = condenseRecapNote("🎮".repeat(400)) ?? "";
		assert.equal([...emojiNote].length, 300);
		assert.equal(emojiNote, "🎮".repeat(300));

		const cutBeforeSpace = condenseRecapNote(`${"a".repeat(299)} b`);
		assert.equal(cutBeforeSpace, "a".repeat(299));
	});
});
