import { type Rewind } from "../../rewind/rewind.interface";
import { SHARE_COLORS, SHARE_IMAGE_SIZES } from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import {
	type OgTemplateInput,
	type SatoriElement
} from "../rewind-share-template.interface";
import { shareCopy } from "../utils/share-copy.util";
import { coverFan } from "./cover-fan.template";
import { duotoneCoverMosaic } from "./cover-mosaic.template";
import { box } from "./elements.template";
import {
	brandBand,
	inlineStats,
	personaLine,
	totalCount
} from "./rewind-blocks.template";

export const OG_COVER_LIMIT = 12;

const { width: OG_WIDTH, height: OG_HEIGHT } = SHARE_IMAGE_SIZES.og;
const PADDING = 56;
const BAND_LAYOUT = {
	top: 0,
	width: OG_WIDTH,
	height: 76,
	paddingX: PADDING,
	wordmarkSize: 26,
	labelSize: 22
};
const BODY_TOP = BAND_LAYOUT.top + BAND_LAYOUT.height;
const BODY_HEIGHT = OG_HEIGHT - BODY_TOP;
const ART_LEFT = 560;
const ART_WIDTH = OG_WIDTH - ART_LEFT;
const LEFT_COLUMN_WIDTH = ART_LEFT - PADDING;
const ART_FADE =
	"linear-gradient(90deg, #0a0a0c 0%, rgba(10, 10, 12, 0.45) 28%, rgba(10, 10, 12, 0.15) 60%, rgba(10, 10, 12, 0.35) 100%), linear-gradient(180deg, rgba(10, 10, 12, 0.2) 0%, rgba(10, 10, 12, 0) 40%, rgba(10, 10, 12, 0.7) 100%)";
const ART_FALLBACK_GLOW =
	"radial-gradient(circle at 75% 15%, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0) 60%)";
const FAN_COVER_LIMIT = 3;
const FAN_LAYOUT = {
	coverWidth: 220,
	coverHeight: 310,
	areaWidth: ART_WIDTH,
	areaHeight: 380,
	spreadX: 128,
	dropY: 12,
	tiltDegrees: 9,
	shrinkPerStep: 0.07
};
const MOSAIC_LAYOUT = {
	columns: 6,
	rows: 4,
	tileWidth: 150,
	tileHeight: 200,
	gap: 12,
	top: -80,
	left: -100,
	tiltDegrees: -9
};
const TOTAL_COUNT_SIZES = {
	maxSize: 200,
	widthBudget: 400,
	labelSize: 36,
	labelMaxWidth: 260,
	captionSize: 20,
	gap: 18
};
const PERSONA_SIZES = { chipSize: 28, phraseSize: 22, gap: 12 };
const INLINE_STAT_SIZES = { valueSize: 36, labelSize: 20, gap: 28 };

function coverArt(covers: ShareCover[]): SatoriElement {
	const size = { width: ART_WIDTH, height: BODY_HEIGHT };
	const mosaic = duotoneCoverMosaic(covers, MOSAIC_LAYOUT, size);
	const fanCovers = covers.slice(0, FAN_COVER_LIMIT);
	return box(
		{
			position: "absolute",
			top: BODY_TOP,
			left: ART_LEFT,
			width: ART_WIDTH,
			height: BODY_HEIGHT,
			overflow: "hidden",
			alignItems: "center",
			justifyContent: "center",
			...(mosaic.length === 0 && { backgroundImage: ART_FALLBACK_GLOW })
		},
		[
			...mosaic,
			box({
				position: "absolute",
				top: 0,
				left: 0,
				width: ART_WIDTH,
				height: BODY_HEIGHT,
				backgroundImage: ART_FADE
			}),
			...(fanCovers.length > 0 ? [coverFan(fanCovers, FAN_LAYOUT)] : [])
		]
	);
}

function details(rewind: Rewind): SatoriElement {
	const copy = shareCopy(rewind.language);
	const stats = inlineStats(rewind, copy, INLINE_STAT_SIZES);
	return box(
		{
			position: "absolute",
			top: BODY_TOP,
			left: PADDING,
			width: LEFT_COLUMN_WIDTH,
			height: BODY_HEIGHT,
			flexDirection: "column",
			justifyContent: "center"
		},
		[
			totalCount(rewind, copy, TOTAL_COUNT_SIZES),
			box({ marginTop: 30 }, [personaLine(rewind, copy, PERSONA_SIZES)]),
			...(stats ? [box({ marginTop: 28 }, [stats])] : [])
		]
	);
}

export function ogTemplate({
	rewind,
	artwork
}: OgTemplateInput): SatoriElement {
	return box(
		{
			position: "relative",
			width: OG_WIDTH,
			height: OG_HEIGHT,
			overflow: "hidden",
			backgroundColor: SHARE_COLORS.canvas
		},
		[
			coverArt(artwork.covers),
			details(rewind),
			brandBand(rewind.year, BAND_LAYOUT)
		]
	);
}
