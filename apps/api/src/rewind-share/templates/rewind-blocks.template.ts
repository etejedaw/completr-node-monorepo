import { type Rewind } from "../../rewind/rewind.interface";
import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCopy } from "../rewind-share.interface";
import {
	type BrandBandLayout,
	type InlineStatSizes,
	type PersonaLineSizes,
	type SatoriElement,
	type StatTile,
	type TotalCountSizes
} from "../rewind-share-template.interface";
import { displayText } from "../utils/display-text.util";
import { box, diamond, text, wordmark } from "./elements.template";
import { leadTile, supportingTiles } from "./stat-tiles.template";

const BAND_GRADIENT = `linear-gradient(90deg, ${SHARE_COLORS.brandDeep} 0%, ${SHARE_COLORS.brand} 60%, ${SHARE_COLORS.brandLight} 100%)`;
const COUNT_GRADIENT = `linear-gradient(180deg, #ffffff 0%, ${SHARE_COLORS.brandPale} 100%)`;
const USERNAME_MAX_LENGTH = 22;
const INLINE_STAT_LIMIT = 3;

export function brandBand(
	year: number,
	layout: BrandBandLayout
): SatoriElement {
	return box(
		{
			position: "absolute",
			top: layout.top,
			left: 0,
			width: layout.width,
			height: layout.height,
			padding: `0px ${layout.paddingX}px`,
			justifyContent: "space-between",
			alignItems: "center",
			backgroundImage: BAND_GRADIENT
		},
		[
			wordmark(layout.wordmarkSize, "#ffffff"),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: layout.labelSize,
					letterSpacing: "0.22em",
					color: "#ffffff"
				},
				`REWIND · ${year}`
			)
		]
	);
}

function countSize(value: string, sizes: TotalCountSizes): number {
	return Math.min(
		sizes.maxSize,
		Math.floor(sizes.widthBudget / value.length)
	);
}

export function totalCount(
	rewind: Rewind,
	copy: ShareCopy,
	sizes: TotalCountSizes
): SatoriElement {
	const lead = leadTile(rewind.totals, copy);
	const size = countSize(lead.value, sizes);
	const username = displayText(rewind.user.username, USERNAME_MAX_LENGTH);
	return box({ alignItems: "flex-end", gap: sizes.gap }, [
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 700,
				fontSize: size,
				lineHeight: 0.8,
				letterSpacing: "-0.05em",
				marginLeft: -size * 0.04,
				paddingRight: size * 0.05,
				flexShrink: 0,
				backgroundImage: COUNT_GRADIENT,
				backgroundClip: "text",
				color: "transparent"
			},
			lead.value
		),
		box(
			{
				flexDirection: "column",
				flexShrink: 1,
				maxWidth: sizes.labelMaxWidth,
				paddingBottom: Math.round(sizes.labelSize * 0.28)
			},
			[
				text(
					{
						fontFamily: SHARE_FONT_FAMILY.display,
						fontWeight: 700,
						fontSize: sizes.labelSize,
						lineHeight: 1,
						color: SHARE_COLORS.foreground
					},
					lead.label
				),
				text(
					{
						fontFamily: SHARE_FONT_FAMILY.text,
						fontWeight: 600,
						fontSize: sizes.captionSize,
						lineHeight: 1.3,
						color: SHARE_COLORS.brandLight,
						marginTop: Math.round(sizes.captionSize * 0.4)
					},
					copy.yearCaption(rewind.year, username)
				)
			]
		)
	]);
}

function personaChip(title: string, chipSize: number): SatoriElement {
	return box(
		{
			alignItems: "center",
			alignSelf: "flex-start",
			gap: chipSize * 0.32,
			padding: `${chipSize * 0.3}px ${chipSize * 0.6}px`,
			borderRadius: chipSize * 0.32,
			backgroundColor: SHARE_COLORS.brand
		},
		[
			diamond(chipSize * 0.45, "#ffffff"),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: chipSize,
					lineHeight: 1.1,
					color: "#ffffff"
				},
				title
			)
		]
	);
}

export function personaLine(
	rewind: Rewind,
	copy: ShareCopy,
	sizes: PersonaLineSizes
): SatoriElement {
	const { title, phrase } = copy.personas[rewind.persona];
	return box({ flexDirection: "column", gap: sizes.gap }, [
		personaChip(title, sizes.chipSize),
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.text,
				fontWeight: 400,
				fontSize: sizes.phraseSize,
				lineHeight: 1.3,
				color: SHARE_COLORS.secondary
			},
			phrase
		)
	]);
}

function inlineStat(tile: StatTile, sizes: InlineStatSizes): SatoriElement {
	return box(
		{ alignItems: "baseline", gap: Math.round(sizes.labelSize * 0.46) },
		[
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: sizes.valueSize,
					color: SHARE_COLORS.foreground
				},
				tile.value
			),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: sizes.labelSize,
					color: SHARE_COLORS.muted
				},
				tile.label
			)
		]
	);
}

export function inlineStats(
	rewind: Rewind,
	copy: ShareCopy,
	sizes: InlineStatSizes
): SatoriElement | null {
	const tiles = supportingTiles(rewind.totals, copy, INLINE_STAT_LIMIT);
	if (tiles.length === 0) return null;
	return box(
		{ flexWrap: "wrap", gap: sizes.gap },
		tiles.map(tile => inlineStat(tile, sizes))
	);
}
