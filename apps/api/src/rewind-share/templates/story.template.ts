import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type ShareArtwork, type ShareCover } from "../rewind-share.interface";
import { displayText } from "../utils/display-text.util";
import { rewindSummary } from "../utils/rewind-summary.util";
import { coverFan } from "./cover-fan.template";
import {
	backdropStyle,
	box,
	gradientYear,
	ownerLabel,
	type SatoriElement,
	text,
	wordmark
} from "./elements.template";
import { personaBadge } from "./persona-badge.template";
import { leadTile, supportingTiles, tileBox } from "./stat-tiles.template";

export interface StoryTemplateInput {
	rewind: Rewind;
	artwork: ShareArtwork;
	host: string;
}

export const STORY_COVER_LIMIT = 5;

const { width: STORY_WIDTH, height: STORY_HEIGHT } = SHARE_IMAGE_SIZES.story;
const SIDE_PADDING = 80;
const CONTENT_WIDTH = STORY_WIDTH - SIDE_PADDING * 2;
const TOP_SAFE_AREA = 220;
const BOTTOM_SAFE_AREA = 280;
const FOOTER_OFFSET = 64;
const USERNAME_MAX_LENGTH = 22;
const TILES_HEIGHT = 348;
const TILES_GAP = 16;
const LEAD_TILE_WIDTH = 400;
const SUPPORTING_TILE_LIMIT = 3;
const FAN_LAYOUT = {
	coverWidth: 244,
	coverHeight: 344,
	areaWidth: STORY_WIDTH,
	areaHeight: 380,
	spreadX: 168,
	dropY: 10,
	tiltDegrees: 7,
	shrinkPerStep: 0.07
};

function header(username: string): SatoriElement {
	return box(
		{
			justifyContent: "space-between",
			alignItems: "center",
			width: CONTENT_WIDTH,
			flexShrink: 0
		},
		[
			wordmark(34),
			ownerLabel(displayText(username, USERNAME_MAX_LENGTH), 36)
		]
	);
}

function titleBlock(rewind: Rewind): SatoriElement {
	return box({ flexDirection: "column", marginTop: 56, flexShrink: 0 }, [
		gradientYear(rewind.year, 384),
		box({ marginTop: 40 }, [
			personaBadge(rewind.persona, { titleSize: 76, phraseSize: 36 })
		])
	]);
}

function summaryHeadline(rewind: Rewind): SatoriElement {
	return box(
		{
			flexGrow: 1,
			flexShrink: 1,
			minHeight: 0,
			alignItems: "center",
			width: CONTENT_WIDTH
		},
		[
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: 92,
					lineHeight: 1.02,
					color: SHARE_COLORS.foreground
				},
				rewindSummary(rewind.totals)
			)
		]
	);
}

function coverStage(rewind: Rewind, covers: ShareCover[]): SatoriElement {
	if (covers.length === 0) return summaryHeadline(rewind);
	return box(
		{
			flexGrow: 1,
			flexShrink: 1,
			minHeight: 0,
			alignItems: "center",
			flexDirection: "column",
			justifyContent: "center",
			gap: 20,
			marginLeft: -SIDE_PADDING,
			width: STORY_WIDTH
		},
		[coverFan(covers, FAN_LAYOUT)]
	);
}

function statTiles(rewind: Rewind): SatoriElement {
	const supporting = supportingTiles(rewind.totals, SUPPORTING_TILE_LIMIT);
	const lead = tileBox(leadTile(rewind.totals), {
		valueSize: 200,
		labelSize: 40,
		width: supporting.length > 0 ? LEAD_TILE_WIDTH : CONTENT_WIDTH,
		height: TILES_HEIGHT,
		stacked: true
	});
	if (supporting.length === 0) return lead;

	const tileHeight =
		(TILES_HEIGHT - TILES_GAP * (supporting.length - 1)) /
		supporting.length;
	return box({ gap: TILES_GAP, width: CONTENT_WIDTH, flexShrink: 0 }, [
		lead,
		box(
			{
				flexDirection: "column",
				gap: TILES_GAP,
				width: CONTENT_WIDTH - LEAD_TILE_WIDTH - TILES_GAP,
				flexShrink: 0
			},
			supporting.map(tile =>
				tileBox(tile, {
					valueSize: 72,
					labelSize: 32,
					width: "100%",
					height: tileHeight,
					stacked: false
				})
			)
		)
	]);
}

function footer(host: string): SatoriElement {
	return text(
		{
			position: "absolute",
			left: SIDE_PADDING,
			top: STORY_HEIGHT - BOTTOM_SAFE_AREA + FOOTER_OFFSET,
			fontFamily: SHARE_FONT_FAMILY.text,
			fontWeight: 600,
			fontSize: 32,
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
			flexDirection: "column",
			width: STORY_WIDTH,
			height: STORY_HEIGHT,
			padding: `${TOP_SAFE_AREA}px ${SIDE_PADDING}px ${BOTTOM_SAFE_AREA}px`,
			overflow: "hidden",
			...backdropStyle(artwork.backdrop, SHARE_IMAGE_SIZES.story)
		},
		[
			header(rewind.user.username),
			titleBlock(rewind),
			coverStage(rewind, artwork.covers),
			statTiles(rewind),
			footer(host)
		]
	);
}
