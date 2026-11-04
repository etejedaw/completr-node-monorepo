import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type ShareCopy, type ShareCover } from "../rewind-share.interface";
import {
	type SatoriElement,
	type StatTile,
	type StoryTemplateInput
} from "../rewind-share-template.interface";
import { displayText } from "../utils/display-text.util";
import { shareCopy } from "../utils/share-copy.util";
import { coverFan } from "./cover-fan.template";
import { duotoneCoverMosaic } from "./cover-mosaic.template";
import { box, text, wordmark } from "./elements.template";
import { personaChip } from "./persona-badge.template";
import { leadTile, supportingTiles } from "./stat-tiles.template";

export const STORY_COVER_LIMIT = 12;

const { width: STORY_WIDTH, height: STORY_HEIGHT } = SHARE_IMAGE_SIZES.story;
const SIDE_PADDING = 80;
const BOTTOM_SAFE_AREA = 280;
const FOOTER_OFFSET = 70;
const BAND_TOP = 150;
const BAND_HEIGHT = 104;
const BAND_GRADIENT = `linear-gradient(90deg, #6d28d9 0%, ${SHARE_COLORS.brand} 60%, ${SHARE_COLORS.brandLight} 100%)`;
const ART_TOP = BAND_TOP + BAND_HEIGHT;
const ART_HEIGHT = 700;
const ART_FADE =
	"linear-gradient(180deg, rgba(10, 10, 12, 0.2) 0%, rgba(10, 10, 12, 0.35) 50%, #0a0a0c 100%)";
const ART_FALLBACK_GLOW =
	"radial-gradient(circle at 85% 0%, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0) 60%)";
const CONTENT_TOP = ART_TOP + 60;
const USERNAME_MAX_LENGTH = 22;
const FAN_COVER_LIMIT = 5;
const INLINE_STAT_LIMIT = 3;
const COUNT_MAX_SIZE = 360;
const COUNT_WIDTH_BUDGET = 720;
const COUNT_LABEL_SIZE = 58;
const COUNT_LABEL_MAX_WIDTH = 420;
const COUNT_GRADIENT = `linear-gradient(180deg, #ffffff 0%, #c4b5fd 100%)`;
const FAN_LAYOUT = {
	coverWidth: 270,
	coverHeight: 380,
	areaWidth: STORY_WIDTH,
	areaHeight: 420,
	spreadX: 182,
	dropY: 10,
	tiltDegrees: 7,
	shrinkPerStep: 0.07
};
const MOSAIC_LAYOUT = {
	columns: 6,
	rows: 5,
	tileWidth: 230,
	tileHeight: 306,
	gap: 18,
	top: -120,
	left: -260,
	tiltDegrees: -9
};

function band(year: number): SatoriElement {
	return box(
		{
			position: "absolute",
			top: BAND_TOP,
			left: 0,
			width: STORY_WIDTH,
			height: BAND_HEIGHT,
			padding: `0px ${SIDE_PADDING}px`,
			justifyContent: "space-between",
			alignItems: "center",
			backgroundImage: BAND_GRADIENT
		},
		[
			wordmark(34, "#ffffff"),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: 30,
					letterSpacing: "0.22em",
					color: "#ffffff"
				},
				`REWIND · ${year}`
			)
		]
	);
}

function coverArt(covers: ShareCover[]): SatoriElement {
	const size = { width: STORY_WIDTH, height: ART_HEIGHT };
	const mosaic = duotoneCoverMosaic(covers, MOSAIC_LAYOUT, size);
	return box(
		{
			position: "absolute",
			top: ART_TOP,
			left: 0,
			width: STORY_WIDTH,
			height: ART_HEIGHT,
			overflow: "hidden",
			...(mosaic.length === 0 && { backgroundImage: ART_FALLBACK_GLOW })
		},
		[
			...mosaic,
			box({
				position: "absolute",
				top: 0,
				left: 0,
				width: STORY_WIDTH,
				height: ART_HEIGHT,
				backgroundImage: ART_FADE
			})
		]
	);
}

function countSize(value: string): number {
	return Math.min(
		COUNT_MAX_SIZE,
		Math.floor(COUNT_WIDTH_BUDGET / value.length)
	);
}

function bigCount(rewind: Rewind, copy: ShareCopy): SatoriElement {
	const lead = leadTile(rewind.totals, copy);
	const size = countSize(lead.value);
	const username = displayText(rewind.user.username, USERNAME_MAX_LENGTH);
	return box({ alignItems: "flex-end", gap: 28 }, [
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
				maxWidth: COUNT_LABEL_MAX_WIDTH,
				paddingBottom: 16
			},
			[
				text(
					{
						fontFamily: SHARE_FONT_FAMILY.display,
						fontWeight: 700,
						fontSize: COUNT_LABEL_SIZE,
						lineHeight: 1,
						color: SHARE_COLORS.foreground
					},
					lead.label
				),
				text(
					{
						fontFamily: SHARE_FONT_FAMILY.text,
						fontWeight: 600,
						fontSize: 30,
						lineHeight: 1.3,
						color: SHARE_COLORS.brandLight,
						marginTop: 12
					},
					copy.yearCaption(rewind.year, username)
				)
			]
		)
	]);
}

function inlineStat(tile: StatTile): SatoriElement {
	return box({ alignItems: "baseline", gap: 14 }, [
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 700,
				fontSize: 54,
				color: SHARE_COLORS.foreground
			},
			tile.value
		),
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.text,
				fontWeight: 600,
				fontSize: 30,
				color: SHARE_COLORS.muted
			},
			tile.label
		)
	]);
}

function inlineStats(rewind: Rewind, copy: ShareCopy): SatoriElement | null {
	const tiles = supportingTiles(
		rewind.totals,
		copy,
		INLINE_STAT_LIMIT,
		copy.compactTiles
	);
	if (tiles.length === 0) return null;
	return box(
		{ flexWrap: "wrap", gap: 48, marginTop: 46 },
		tiles.map(inlineStat)
	);
}

function details(rewind: Rewind, copy: ShareCopy): SatoriElement {
	const stats = inlineStats(rewind, copy);
	return box(
		{
			flexDirection: "column",
			padding: `0px ${SIDE_PADDING}px`,
			flexShrink: 0
		},
		[
			bigCount(rewind, copy),
			box({ marginTop: 50 }, [personaChip(rewind.persona, copy, 40)]),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 400,
					fontSize: 34,
					lineHeight: 1.3,
					color: SHARE_COLORS.secondary,
					marginTop: 18
				},
				copy.personas[rewind.persona].phrase
			),
			...(stats ? [stats] : [])
		]
	);
}

function content(rewind: Rewind, covers: ShareCover[]): SatoriElement {
	const copy = shareCopy(rewind.language);
	const fanCovers = covers.slice(0, FAN_COVER_LIMIT);
	return box(
		{
			position: "absolute",
			top: CONTENT_TOP,
			left: 0,
			width: STORY_WIDTH,
			height: STORY_HEIGHT - BOTTOM_SAFE_AREA - CONTENT_TOP,
			flexDirection: "column",
			justifyContent: "space-evenly"
		},
		[
			...(fanCovers.length > 0 ? [coverFan(fanCovers, FAN_LAYOUT)] : []),
			details(rewind, copy)
		]
	);
}

function footer(host: string): SatoriElement {
	return text(
		{
			position: "absolute",
			left: SIDE_PADDING,
			top: STORY_HEIGHT - BOTTOM_SAFE_AREA + FOOTER_OFFSET,
			fontFamily: SHARE_FONT_FAMILY.text,
			fontWeight: 600,
			fontSize: 30,
			color: SHARE_COLORS.muted
		},
		host
	);
}

export function storyTemplate({
	rewind,
	artwork,
	host
}: StoryTemplateInput): SatoriElement {
	return box(
		{
			position: "relative",
			width: STORY_WIDTH,
			height: STORY_HEIGHT,
			overflow: "hidden",
			backgroundColor: SHARE_COLORS.canvas
		},
		[
			coverArt(artwork.covers),
			band(rewind.year),
			content(rewind, artwork.covers),
			footer(host)
		]
	);
}
