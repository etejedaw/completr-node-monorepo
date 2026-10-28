import { type RewindTotals } from "../../rewind/rewind.interface";
import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import {
	formatCount,
	formatHours,
	formatRating
} from "../utils/format-count.util";
import { box, type SatoriElement, text } from "./elements.template";

export interface StatTile {
	label: string;
	value: string;
	color: string;
}

export function leadTile(totals: RewindTotals): StatTile {
	if (totals.finished > 0) {
		return {
			label: totals.finished === 1 ? "game finished" : "games finished",
			value: formatCount(totals.finished),
			color: SHARE_COLORS.finished
		};
	}
	return {
		label: totals.started === 1 ? "game started" : "games started",
		value: formatCount(totals.started),
		color: SHARE_COLORS.started
	};
}

function hoursColor(totals: RewindTotals): string {
	return totals.finished > 0 ? SHARE_COLORS.started : SHARE_COLORS.blue;
}

function candidateTiles(totals: RewindTotals): (StatTile | null)[] {
	return [
		totals.hoursPlayed > 0
			? {
					label: "hours played",
					value: formatHours(totals.hoursPlayed),
					color: hoursColor(totals)
				}
			: null,
		totals.finishRate === null
			? null
			: {
					label: "finish rate",
					value: `${totals.finishRate}%`,
					color: SHARE_COLORS.pink
				},
		totals.platinums
			? {
					label: totals.platinums === 1 ? "platinum" : "platinums",
					value: formatCount(totals.platinums),
					color: SHARE_COLORS.platinum
				}
			: null,
		totals.abandoned > 0
			? {
					label: "left behind",
					value: formatCount(totals.abandoned),
					color: SHARE_COLORS.abandoned
				}
			: null,
		totals.averageRating === null
			? null
			: {
					label: "average rating",
					value: formatRating(totals.averageRating),
					color: SHARE_COLORS.orange
				},
		totals.genresPlayed > 0
			? {
					label: totals.genresPlayed === 1 ? "genre" : "genres",
					value: formatCount(totals.genresPlayed),
					color: SHARE_COLORS.lime
				}
			: null
	];
}

export function supportingTiles(
	totals: RewindTotals,
	limit: number
): StatTile[] {
	return candidateTiles(totals)
		.filter((tile): tile is StatTile => tile !== null)
		.slice(0, limit);
}

export interface TileBoxStyle {
	valueSize: number;
	labelSize: number;
	width: number | string;
	height: number;
	stacked: boolean;
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
