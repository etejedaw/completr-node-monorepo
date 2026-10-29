import {
	type RewindGameGenre,
	type RewindRun
} from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { resolveRunHours } from "../../rewind/utils/resolve-run-hours.util";
import { roundToTenth } from "../../rewind/utils/round-to-tenth.util";
import {
	type RecapClosedGame,
	type RecapGroupStats,
	type RecapLengthBucket,
	type RecapSameDayClose,
	type RecapTimedGame,
	type RewindRecapPatterns
} from "../rewind-recap.interface";

const MIN_GROUP_GAMES = 2;
const QUICK_DROP_MAX_DAYS = 7;
const SLOWEST_FINISHES_LIMIT = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LENGTH_BUCKETS: RecapLengthBucket[] = [
	{ name: "under 5 hours", maxHours: 5 },
	{ name: "5 to 15 hours", maxHours: 15 },
	{ name: "15 to 30 hours", maxHours: 30 },
	{ name: "over 30 hours", maxHours: Number.POSITIVE_INFINITY }
];

const QUARTER_NAMES = [
	"January to March",
	"April to June",
	"July to September",
	"October to December"
];

function toDateOnly(value: string | null): string | null {
	return value === null ? null : value.slice(0, 10);
}

function isClosedInYear(run: RewindRun, year: number): boolean {
	return (
		(run.status === "completed" || run.status === "abandoned") &&
		toDateOnly(run.finishedAt)?.slice(0, 4) === String(year)
	);
}

function isImportedClose(run: RewindRun, year: number): boolean {
	return (
		run.startedAt === null && toDateOnly(run.finishedAt) === `${year}-01-01`
	);
}

function averageOf(values: number[]): number | null {
	if (values.length === 0) return null;
	return roundToTenth(
		values.reduce((sum, value) => sum + value, 0) / values.length
	);
}

export function ratingVsCritics(run: RewindRun): number | null {
	if (run.userRating === null || run.score === null) return null;
	return roundToTenth(run.userRating - run.score);
}

export function daysToFinish(run: RewindRun): number | null {
	const startedAt = toDateOnly(run.startedAt);
	const finishedAt = toDateOnly(run.finishedAt);
	if (startedAt === null || finishedAt === null) return null;
	return Math.round(
		(Date.parse(finishedAt) - Date.parse(startedAt)) / MS_PER_DAY
	);
}

function titlesWithStatus(runs: RewindRun[], status: string): string[] {
	return runs.filter(run => run.status === status).map(run => run.game.title);
}

function summarizeGroup(name: string, runs: RewindRun[]): RecapGroupStats {
	const ratings = runs.flatMap(run =>
		run.userRating === null ? [] : [run.userRating]
	);
	const gaps = runs.flatMap(run => {
		const gap = ratingVsCritics(run);
		return gap === null ? [] : [gap];
	});
	const hours = runs.flatMap(run => {
		const runHours = resolveRunHours(run);
		return runHours === null ? [] : [runHours.hours];
	});
	return {
		name,
		games: runs.length,
		finished: runs.filter(run => run.status === "completed").length,
		abandoned: runs.filter(run => run.status === "abandoned").length,
		averageRating: averageOf(ratings),
		averageRatingVsCritics: averageOf(gaps),
		averageHours: averageOf(hours),
		finishedTitles: titlesWithStatus(runs, "completed"),
		abandonedTitles: titlesWithStatus(runs, "abandoned")
	};
}

function groupBy(
	runs: RewindRun[],
	keysOf: (run: RewindRun) => string[]
): Map<string, RewindRun[]> {
	const groups = new Map<string, RewindRun[]>();
	for (const run of runs) {
		for (const key of new Set(keysOf(run))) {
			groups.set(key, [...(groups.get(key) ?? []), run]);
		}
	}
	return groups;
}

function summarizeGroups(
	groups: Map<string, RewindRun[]>,
	minGames: number
): RecapGroupStats[] {
	return [...groups.entries()]
		.filter(([, runs]) => runs.length >= minGames)
		.map(([name, runs]) => summarizeGroup(name, runs))
		.sort(
			(first, second) =>
				second.games - first.games ||
				compareText(first.name, second.name)
		);
}

function lengthBucketOf(run: RewindRun): string[] {
	const runHours = resolveRunHours(run);
	if (runHours === null) return [];
	const bucket = LENGTH_BUCKETS.find(
		candidate => runHours.hours < candidate.maxHours
	);
	return bucket ? [bucket.name] : [];
}

function quarterOf(run: RewindRun): string[] {
	const month = Number(toDateOnly(run.finishedAt)?.slice(5, 7));
	const name = QUARTER_NAMES[Math.floor((month - 1) / 3)];
	return name ? [name] : [];
}

function orderedByName(
	stats: RecapGroupStats[],
	names: string[]
): RecapGroupStats[] {
	return names.flatMap(name => stats.filter(entry => entry.name === name));
}

function toClosedGame(run: RewindRun): RecapClosedGame {
	return {
		title: run.game.title,
		status: run.status,
		userRating: run.userRating
	};
}

function findSameDayCloses(runs: RewindRun[]): RecapSameDayClose[] {
	const byDate = groupBy(runs, run => [toDateOnly(run.finishedAt) ?? ""]);
	return [...byDate.entries()]
		.filter(([date, closed]) => date !== "" && closed.length >= 2)
		.map(([date, closed]) => ({ date, games: closed.map(toClosedGame) }))
		.sort((first, second) => compareText(first.date, second.date));
}

function toTimedGame(run: RewindRun): RecapTimedGame | null {
	const days = daysToFinish(run);
	const startedAt = toDateOnly(run.startedAt);
	const finishedAt = toDateOnly(run.finishedAt);
	if (days === null || startedAt === null || finishedAt === null) return null;
	return {
		title: run.game.title,
		status: run.status,
		startedAt,
		finishedAt,
		days
	};
}

function timedGames(runs: RewindRun[]): RecapTimedGame[] {
	return runs.flatMap(run => {
		const timed = toTimedGame(run);
		return timed === null ? [] : [timed];
	});
}

export function buildRewindRecapPatterns(
	runs: RewindRun[],
	genres: RewindGameGenre[],
	year: number
): RewindRecapPatterns {
	const closedInYear = runs.filter(run => isClosedInYear(run, year));
	const closed = closedInYear.filter(run => !isImportedClose(run, year));
	const namesByGame = new Map<string, string[]>();
	for (const genre of genres) {
		namesByGame.set(genre.gameId, [
			...(namesByGame.get(genre.gameId) ?? []),
			genre.name
		]);
	}
	const timed = timedGames(closed);

	return {
		byGenre: summarizeGroups(
			groupBy(closed, run => namesByGame.get(run.gameId) ?? []),
			MIN_GROUP_GAMES
		),
		byPlatform: summarizeGroups(
			groupBy(closed, run =>
				run.platform ? [run.platform.abbreviation] : []
			),
			MIN_GROUP_GAMES
		),
		byLength: orderedByName(
			summarizeGroups(groupBy(closed, lengthBucketOf), 1),
			LENGTH_BUCKETS.map(bucket => bucket.name)
		),
		byQuarter: orderedByName(
			summarizeGroups(groupBy(closed, quarterOf), 1),
			QUARTER_NAMES
		),
		sameDayCloses: findSameDayCloses(closed),
		quickDrops: timed
			.filter(
				game =>
					game.status === "abandoned" &&
					game.days <= QUICK_DROP_MAX_DAYS
			)
			.sort((first, second) => first.days - second.days),
		slowestFinishes: timed
			.filter(game => game.status === "completed")
			.sort((first, second) => second.days - first.days)
			.slice(0, SLOWEST_FINISHES_LIMIT),
		startedInEarlierYears: timed.filter(
			game => Number(game.startedAt.slice(0, 4)) < year
		),
		importedCloses: closedInYear.length - closed.length
	};
}
