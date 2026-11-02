import { type RewindTotals } from "../../rewind/rewind.interface";
import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCopy } from "../rewind-share.interface";
import {
	type SatoriElement,
	type StatTile,
	type TileBoxStyle
} from "../rewind-share-template.interface";
import { countLabel } from "../utils/count-label.util";
import {
	formatCount,
	formatHours,
	formatRating
} from "../utils/format-count.util";
import { box, text } from "./elements.template";

export function leadTile(totals: RewindTotals, copy: ShareCopy): StatTile {
	const locale = copy.numberLocale;
	if (totals.finished > 0) {
		return {
			label: countLabel(totals.finished, copy.tiles.gamesFinished),
			value: formatCount(totals.finished, locale),
			color: SHARE_COLORS.finished
		};
	}
	return {
		label: countLabel(totals.started, copy.tiles.gamesStarted),
		value: formatCount(totals.started, locale),
		color: SHARE_COLORS.started
	};
}

function hoursColor(totals: RewindTotals): string {
	return totals.finished > 0 ? SHARE_COLORS.started : SHARE_COLORS.blue;
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
					value: formatHours(totals.hoursPlayed, locale),
					color: hoursColor(totals)
				}
			: null,
		totals.finishRate === null
			? null
			: {
					label: tiles.finishRate,
					value: `${totals.finishRate}%`,
					color: SHARE_COLORS.pink
				},
		totals.platinums
			? {
					label: countLabel(totals.platinums, tiles.platinums),
					value: formatCount(totals.platinums, locale),
					color: SHARE_COLORS.platinum
				}
			: null,
		totals.abandoned > 0
			? {
					label: tiles.leftBehind,
					value: formatCount(totals.abandoned, locale),
					color: SHARE_COLORS.abandoned
				}
			: null,
		totals.averageRating === null
			? null
			: {
					label: tiles.averageRating,
					value: formatRating(totals.averageRating, locale),
					color: SHARE_COLORS.orange
				},
		totals.genresPlayed > 0
			? {
					label: countLabel(totals.genresPlayed, tiles.genres),
					value: formatCount(totals.genresPlayed, locale),
					color: SHARE_COLORS.lime
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

export function tileBox(tile: StatTile, style: TileBoxStyle): SatoriElement {
	return box(
		{
			flexDirection: style.stacked ? "column" : "row",
			justifyContent: style.stacked ? "flex-end" : "space-between",
			alignItems: style.stacked ? "flex-start" : "center",
			width: style.width,
			height: style.height,
			padding: `0px ${style.labelSize * 0.9}px ${style.stacked ? style.labelSize * 0.8 : 0}px`,
			borderRadius: style.labelSize * 0.7,
			backgroundColor: tile.color,
			flexShrink: 0,
			boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45)"
		},
		[
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: style.valueSize,
					lineHeight: 0.9,
					letterSpacing: "-0.02em",
					color: SHARE_COLORS.ink
				},
				tile.value
			),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: style.labelSize,
					lineHeight: 1.1,
					color: SHARE_COLORS.ink,
					marginTop: style.stacked ? style.labelSize * 0.35 : 0
				},
				tile.label
			)
		]
	);
}
