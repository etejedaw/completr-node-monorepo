import { type RewindRun } from "../../rewind/rewind-run.interface";
import {
	LENGTH_BUCKETS,
	REWIND_RECAP_PLATINUM_GENRES_LIMIT
} from "../rewind-recap.constants";
import {
	type RecapPlatinumStats,
	type RewindRunPlatinum
} from "../rewind-recap.interface";
import { daysToPlatinum } from "./days-to-platinum.util";
import { groupBy } from "./group-by.util";
import { lengthBucketOf } from "./length-bucket-of.util";
import { medianOf } from "./median-of.util";
import { summarizePlatinumGroups } from "./summarize-platinum-groups.util";

export function summarizePlatinums(
	closed: RewindRun[],
	platinumsByRun: Map<string, RewindRunPlatinum> | null,
	genreNamesByGame: Map<string, string[]>
): RecapPlatinumStats | null {
	if (platinumsByRun === null) return null;
	const platinumed = closed.filter(run => platinumsByRun.has(run.id));
	const days = platinumed.map(run =>
		daysToPlatinum(run, platinumsByRun.get(run.id))
	);
	const dated = days.filter((count): count is number => count !== null);
	const daysAfterFinishing = dated.filter(count => count > 0);
	const hasPlatinums = platinumed.length > 0;
	const lengthOrder = LENGTH_BUCKETS.map(bucket => bucket.name);

	return {
		platinumed: platinumed.length,
		sameDay: dated.filter(count => count === 0).length,
		afterFinishing: daysAfterFinishing.length,
		beforeFinishing: dated.filter(count => count < 0).length,
		undated: days.length - dated.length,
		medianDaysAfterFinishing: medianOf(daysAfterFinishing),
		byGenre: hasPlatinums
			? summarizePlatinumGroups(
					groupBy(
						closed,
						run => genreNamesByGame.get(run.gameId) ?? []
					),
					platinumsByRun
				)
					.filter(group => group.platinumed > 0)
					.slice(0, REWIND_RECAP_PLATINUM_GENRES_LIMIT)
			: [],
		byLength: hasPlatinums
			? summarizePlatinumGroups(
					groupBy(closed, lengthBucketOf),
					platinumsByRun
				).sort(
					(first, second) =>
						lengthOrder.indexOf(first.name) -
						lengthOrder.indexOf(second.name)
				)
			: []
	};
}
