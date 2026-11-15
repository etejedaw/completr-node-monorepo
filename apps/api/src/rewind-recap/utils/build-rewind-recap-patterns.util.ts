import {
	type RewindGameFranchise,
	type RewindGameGenre,
	type RewindRun
} from "../../rewind/rewind-run.interface";
import {
	LENGTH_BUCKETS,
	MIN_GROUP_GAMES,
	QUARTER_NAMES
} from "../rewind-recap.constants";
import { type RewindRecapPatterns } from "../rewind-recap.interface";
import { findFranchises } from "./find-franchises.util";
import { findSameDayCloses } from "./find-same-day-closes.util";
import { groupBy } from "./group-by.util";
import { isClosedInYear } from "./is-closed-in-year.util";
import { isImportedClose } from "./is-imported-close.util";
import { lengthBucketOf } from "./length-bucket-of.util";
import { orderedByName } from "./ordered-by-name.util";
import { quarterOf } from "./quarter-of.util";
import { summarizeGroups } from "./summarize-groups.util";
import { summarizeOverlap } from "./summarize-overlap.util";
import { summarizePace } from "./summarize-pace.util";
import { summarizeRatingHabits } from "./summarize-rating-habits.util";
import { summarizeSocial } from "./summarize-social.util";
import { timedGames } from "./timed-games.util";

const QUICK_DROP_MAX_DAYS = 7;

const SLOWEST_FINISHES_LIMIT = 3;

export function buildRewindRecapPatterns(
	runs: RewindRun[],
	genres: RewindGameGenre[],
	year: number,
	franchises: RewindGameFranchise[] = [],
	coopAliasesByRun = new Map<string, string[]>()
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
		bySocial: summarizeSocial(closed, coopAliasesByRun),
		byPartner: summarizeGroups(
			groupBy(closed, run => coopAliasesByRun.get(run.id) ?? []),
			MIN_GROUP_GAMES
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
		pace: summarizePace(closed),
		franchises: findFranchises(closed, franchises),
		overlap: summarizeOverlap(closed),
		ratingHabits: summarizeRatingHabits(closed),
		importedCloses: closedInYear.length - closed.length
	};
}
