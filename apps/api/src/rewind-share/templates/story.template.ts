import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import {
	type SatoriElement,
	type StoryTemplateInput
} from "../rewind-share-template.interface";
import { shareCopy } from "../utils/share-copy.util";
import { coverFan } from "./cover-fan.template";
import { duotoneCoverMosaic } from "./cover-mosaic.template";
import { box, text } from "./elements.template";
import {
	brandBand,
	inlineStats,
	personaLine,
	totalCount
} from "./rewind-blocks.template";

export const STORY_COVER_LIMIT = 12;

const { width: STORY_WIDTH, height: STORY_HEIGHT } = SHARE_IMAGE_SIZES.story;
const SIDE_PADDING = 80;
const BOTTOM_SAFE_AREA = 280;
const FOOTER_OFFSET = 70;
const BAND_LAYOUT = {
	top: 150,
	width: STORY_WIDTH,
	height: 104,
	paddingX: SIDE_PADDING,
	wordmarkSize: 34,
	labelSize: 30
};
const ART_TOP = BAND_LAYOUT.top + BAND_LAYOUT.height;
const ART_HEIGHT = 700;
const ART_FADE =
	"linear-gradient(180deg, rgba(10, 10, 12, 0.2) 0%, rgba(10, 10, 12, 0.35) 50%, #0a0a0c 100%)";
const ART_FALLBACK_GLOW =
	"radial-gradient(circle at 85% 0%, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0) 60%)";
const CONTENT_TOP = ART_TOP + 60;
const FAN_COVER_LIMIT = 5;
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
const TOTAL_COUNT_SIZES = {
	maxSize: 360,
	widthBudget: 720,
	labelSize: 58,
	labelMaxWidth: 420,
	captionSize: 30,
	gap: 28
};
const PERSONA_SIZES = { chipSize: 40, phraseSize: 34, gap: 18 };
const INLINE_STAT_SIZES = { valueSize: 54, labelSize: 30, gap: 48 };

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

function details(rewind: Rewind): SatoriElement {
	const copy = shareCopy(rewind.language);
	const stats = inlineStats(rewind, copy, INLINE_STAT_SIZES);
	return box(
		{
			flexDirection: "column",
			padding: `0px ${SIDE_PADDING}px`,
			flexShrink: 0
		},
		[
			totalCount(rewind, copy, TOTAL_COUNT_SIZES),
			box({ marginTop: 50 }, [personaLine(rewind, copy, PERSONA_SIZES)]),
			...(stats ? [box({ marginTop: 46 }, [stats])] : [])
		]
	);
}

function content(rewind: Rewind, covers: ShareCover[]): SatoriElement {
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
			details(rewind)
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
			brandBand(rewind.year, BAND_LAYOUT),
			content(rewind, artwork.covers),
			footer(host)
		]
	);
}
