import {
	type RewindDurationGame,
	type RewindFinishedGame,
	type RewindGenre,
	type RewindHighlights,
	type RewindPlatform
} from "../../rewind/rewind.interface";
import {
	type RewindGameGenre,
	type RewindRun
} from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import {
	type GameRowLookups,
	type RewindRecapInput
} from "../rewind-recap.interface";
import { type GameRow } from "../rewind-recap.types";
import {
	buildRewindRecapPatterns,
	daysInBacklog,
	daysToFinish,
	groupFranchiseNamesByGame,
	paceVsEstimate,
	ratingVsCritics
} from "./build-rewind-recap-patterns.util";

export const REWIND_RECAP_MAX_GAME_ROWS = 200;

export const REWIND_RECAP_GAME_COLUMNS = [
	"title",
	"status",
	"startedAt",
	"finishedAt",
	"platform",
	"genres",
	"franchise",
	"realHours",
	"estimatedHours",
	"paceVsEstimate",
	"userRating",
	"criticScore",
	"ratingVsCritics",
	"daysInBacklog",
	"daysToFinish"
] as const;

export const REWIND_RECAP_NOTES_COLUMN = "notes";

export const REWIND_RECAP_NOTE_MAX_LENGTH = 300;

const WHITESPACE_RUN = /\s+/g;

const STILL_RUNNING_STATUSES = new Set(["playing", "endless"]);

function toDateOnly(value: string | null): string | null {
	return value === null ? null : value.slice(0, 10);
}

function toIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function activityStart(run: RewindRun): string | null {
	return toDateOnly(run.startedAt) ?? toDateOnly(run.finishedAt);
}

function activityEnd(run: RewindRun, today: string): string | null {
	const finishedAt = toDateOnly(run.finishedAt);
	if (finishedAt !== null) return finishedAt;
	if (STILL_RUNNING_STATUSES.has(run.status)) return today;
	return toDateOnly(run.startedAt);
}

function isActiveInYear(run: RewindRun, year: number, today: string) {
	const start = activityStart(run);
	const end = activityEnd(run, today);
	if (start === null || end === null) return false;
	return end >= `${year}-01-01` && start <= `${year}-12-31`;
}

function isClosedInYear(run: RewindRun, year: number): boolean {
	return (
		(run.status === "completed" || run.status === "abandoned") &&
		toDateOnly(run.finishedAt)?.slice(0, 4) === String(year)
	);
}

function compareLatestActivityFirst(first: RewindRun, second: RewindRun) {
	return (
		compareText(
			toDateOnly(second.finishedAt) ?? "",
			toDateOnly(first.finishedAt) ?? ""
		) ||
		compareText(activityStart(second) ?? "", activityStart(first) ?? "") ||
		compareText(first.id, second.id)
	);
}

function compareChronologically(first: RewindRun, second: RewindRun) {
	return (
		compareText(activityStart(first) ?? "", activityStart(second) ?? "") ||
		compareText(
			toDateOnly(first.finishedAt) ?? "",
			toDateOnly(second.finishedAt) ?? ""
		) ||
		compareText(first.id, second.id)
	);
}

function pickRecapRuns(activeRuns: RewindRun[], year: number): RewindRun[] {
	const closed = activeRuns.filter(run => isClosedInYear(run, year));
	const others = activeRuns.filter(run => !isClosedInYear(run, year));
	return [
		...closed.sort(compareLatestActivityFirst),
		...others.sort(compareLatestActivityFirst)
	]
		.slice(0, REWIND_RECAP_MAX_GAME_ROWS)
		.sort(compareChronologically);
}

function groupGenreNamesByGame(
	genres: RewindGameGenre[]
): Map<string, string[]> {
	const namesByGame = new Map<string, string[]>();
	for (const genre of genres) {
		const names = namesByGame.get(genre.gameId) ?? [];
		if (!names.includes(genre.name)) names.push(genre.name);
		namesByGame.set(genre.gameId, names);
	}
	return namesByGame;
}

export function condenseRecapNote(notes: string | null): string | null {
	if (notes === null) return null;
	const condensed = notes.replace(WHITESPACE_RUN, " ").trim();
	if (condensed === "") return null;
	return [...condensed]
		.slice(0, REWIND_RECAP_NOTE_MAX_LENGTH)
		.join("")
		.trimEnd();
}

function toGameRow(
	run: RewindRun,
	lookups: GameRowLookups,
	includesNotes: boolean
): GameRow {
	const row: GameRow = [
		run.game.title,
		run.status,
		toDateOnly(run.startedAt),
		toDateOnly(run.finishedAt),
		run.platform?.abbreviation ?? null,
		lookups.genreNamesByGame.get(run.gameId)?.join("/") ?? null,
		lookups.franchiseNamesByGame.get(run.gameId)?.join("/") ?? null,
		run.realDuration,
		run.duration,
		paceVsEstimate(run),
		run.userRating,
		run.score,
		ratingVsCritics(run),
		daysInBacklog(run),
		daysToFinish(run)
	];
	return includesNotes ? [...row, condenseRecapNote(run.notes)] : row;
}

function recapGameColumns(includesNotes: boolean): string[] {
	return includesNotes
		? [...REWIND_RECAP_GAME_COLUMNS, REWIND_RECAP_NOTES_COLUMN]
		: [...REWIND_RECAP_GAME_COLUMNS];
}

function summarizeFinishedGame(game: RewindFinishedGame | null) {
	return game && { title: game.title, finishedAt: game.finishedAt };
}

function summarizeDurationGame(game: RewindDurationGame | null) {
	return (
		game && {
			title: game.title,
			hours: game.hours,
			hoursEstimated: game.isEstimate
		}
	);
}

function summarizeGenre(genre: RewindGenre) {
	return { name: genre.name, count: genre.count };
}

function summarizePlatform(platform: RewindPlatform) {
	return {
		name: platform.name,
		abbreviation: platform.abbreviation,
		count: platform.count
	};
}

function summarizeHighlights(highlights: RewindHighlights) {
	const { topRated, bestRatio, favoriteGenre, topPlatform } = highlights;
	return {
		topRated: topRated && {
			title: topRated.title,
			userRating: topRated.userRating
		},
		bestRatio: bestRatio && {
			title: bestRatio.title,
			personalRatio: bestRatio.personalRatio
		},
		longest: summarizeDurationGame(highlights.longest),
		fastest: summarizeDurationGame(highlights.fastest),
		favoriteGenre: favoriteGenre && summarizeGenre(favoriteGenre),
		topPlatform: topPlatform && summarizePlatform(topPlatform),
		busiestMonth: highlights.busiestMonth,
		firstFinished: summarizeFinishedGame(highlights.firstFinished),
		lastFinished: summarizeFinishedGame(highlights.lastFinished),
		topGenres: highlights.topGenres.map(summarizeGenre),
		topPlatforms: highlights.topPlatforms.map(summarizePlatform),
		longestStreak: highlights.longestStreak
	};
}

export function buildRewindRecapContent(
	input: RewindRecapInput,
	today: Date
): string {
	const todayDate = toIsoDate(today);
	const activeRuns = input.runs.filter(run =>
		isActiveInYear(run, input.year, todayDate)
	);
	const recapRuns = pickRecapRuns(activeRuns, input.year);
	const lookups: GameRowLookups = {
		genreNamesByGame: groupGenreNamesByGame(input.genres),
		franchiseNamesByGame: groupFranchiseNamesByGame(input.franchises)
	};

	return JSON.stringify({
		year: input.year,
		persona: input.rewind.persona,
		totals: input.rewind.totals,
		highlights: summarizeHighlights(input.rewind.highlights),
		previousYear: input.previousYearTotals,
		patterns: buildRewindRecapPatterns(
			activeRuns,
			input.genres,
			input.year,
			input.franchises
		),
		games: {
			columns: recapGameColumns(input.includesNotes),
			rows: recapRuns.map(run =>
				toGameRow(run, lookups, input.includesNotes)
			),
			total: activeRuns.length,
			included: recapRuns.length,
			truncated: recapRuns.length < activeRuns.length
		}
	});
}
