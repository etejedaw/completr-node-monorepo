import { type RewindTotals } from "../../rewind/rewind.interface";
import { type ShareCopy } from "../rewind-share.interface";
import { type StatTile } from "../rewind-share-template.interface";
import { countLabel } from "../utils/count-label.util";
import {
	formatCount,
	formatHours,
	formatRating
} from "../utils/format-count.util";

export function leadTile(totals: RewindTotals, copy: ShareCopy): StatTile {
	const locale = copy.numberLocale;
	if (totals.finished > 0) {
		return {
			label: countLabel(totals.finished, copy.tiles.gamesFinished),
			value: formatCount(totals.finished, locale)
		};
	}
	return {
		label: countLabel(totals.started, copy.tiles.gamesStarted),
		value: formatCount(totals.started, locale)
	};
}

function candidateTiles(
	totals: RewindTotals,
	copy: ShareCopy
): (StatTile | null)[] {
	const { tiles, numberLocale: locale } = copy;
	return [
		totals.hoursPlayed > 0
			? {
					label: tiles.hoursPlayed,
					value: formatHours(totals.hoursPlayed, locale)
				}
			: null,
		totals.finishRate === null
			? null
			: {
					label: tiles.finishRate,
					value: `${totals.finishRate}%`
				},
		totals.platinums
			? {
					label: countLabel(totals.platinums, tiles.platinums),
					value: formatCount(totals.platinums, locale)
				}
			: null,
		totals.abandoned > 0
			? {
					label: tiles.leftBehind,
					value: formatCount(totals.abandoned, locale)
				}
			: null,
		totals.averageRating === null
			? null
			: {
					label: tiles.averageRating,
					value: formatRating(totals.averageRating, locale)
				},
		totals.genresPlayed > 0
			? {
					label: countLabel(totals.genresPlayed, tiles.genres),
					value: formatCount(totals.genresPlayed, locale)
				}
			: null
	];
}

export function supportingTiles(
	totals: RewindTotals,
	copy: ShareCopy,
	limit: number
): StatTile[] {
	return candidateTiles(totals, copy)
		.filter((tile): tile is StatTile => tile !== null)
		.slice(0, limit);
}
