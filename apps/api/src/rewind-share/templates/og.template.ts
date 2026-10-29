import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import {
	type ShareArtwork,
	type ShareCopy,
	type ShareCover
} from "../rewind-share.interface";
import { displayText } from "../utils/display-text.util";
import { rewindSummary } from "../utils/rewind-summary.util";
import { shareCopy } from "../utils/share-copy.util";
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

export interface OgTemplateInput {
	rewind: Rewind;
	artwork: ShareArtwork;
}

export const OG_COVER_LIMIT = 3;

const PADDING = 56;
const LEFT_COLUMN_WIDTH = 620;
const USERNAME_MAX_LENGTH = 22;
const TILE_WIDTH = 196;
const TILE_HEIGHT = 112;
const SUPPORTING_TILE_LIMIT = 2;
const FAN_LAYOUT = {
	coverWidth: 220,
	coverHeight: 318,
	areaWidth: 468,
	areaHeight: 518,
	spreadX: 118,
	dropY: 14,
	tiltDegrees: 9,
	shrinkPerStep: 0.07
};

function header(username: string, copy: ShareCopy): SatoriElement {
	return box({ alignItems: "center", gap: 24 }, [
		wordmark(24),
		ownerLabel(displayText(username, USERNAME_MAX_LENGTH), copy, 24)
	]);
}

function statTiles(rewind: Rewind): SatoriElement {
	const copy = shareCopy(rewind.language);
	const tiles = [
		leadTile(rewind.totals, copy),
		...supportingTiles(rewind.totals, copy, SUPPORTING_TILE_LIMIT)
	];
	return box(
		{ gap: 14, marginTop: 30 },
		tiles.map(tile =>
			tileBox(tile, {
				valueSize: 52,
				labelSize: 20,
				width: TILE_WIDTH,
				height: TILE_HEIGHT,
				stacked: true
			})
		)
	);
}

function leftColumn(rewind: Rewind): SatoriElement {
	const copy = shareCopy(rewind.language);
	return box(
		{
			flexDirection: "column",
			justifyContent: "center",
			width: LEFT_COLUMN_WIDTH,
			flexShrink: 0
		},
		[
			header(rewind.user.username, copy),
			box({ marginTop: 26 }, [gradientYear(rewind.year, 176)]),
			box({ marginTop: 22 }, [
				personaBadge(rewind.persona, copy, {
					titleSize: 38,
					phraseSize: 22
				})
			]),
			statTiles(rewind)
		]
	);
}

function rightColumn(rewind: Rewind, covers: ShareCover[]): SatoriElement {
	const copy = shareCopy(rewind.language);
	if (covers.length === 0) {
		return box({ flexGrow: 1, alignItems: "center", paddingLeft: 40 }, [
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: 52,
					lineHeight: 1.08,
					color: SHARE_COLORS.foreground
				},
				rewindSummary(rewind.totals, copy)
			)
		]);
	}
	return box(
		{
			flexGrow: 1,
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			marginRight: -PADDING
		},
		[coverFan(covers, FAN_LAYOUT)]
	);
}

export function ogTemplate({
	rewind,
	artwork
}: OgTemplateInput): SatoriElement {
	return box(
		{
			position: "relative",
			width: SHARE_IMAGE_SIZES.og.width,
			height: SHARE_IMAGE_SIZES.og.height,
			padding: PADDING,
			overflow: "hidden",
			...backdropStyle(artwork.backdrop, SHARE_IMAGE_SIZES.og)
		},
		[leftColumn(rewind), rightColumn(rewind, artwork.covers)]
	);
}
