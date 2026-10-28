import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import { displayText } from "../utils/display-text.util";
import { rewindSummary } from "../utils/rewind-summary.util";
import {
	box,
	brandGlow,
	coverCard,
	type SatoriElement,
	singleLine,
	tallyRow,
	text,
	wordmark
} from "./elements.template";
import { tallyEntries } from "./tally-entries.template";

export interface OgTemplateInput {
	rewind: Rewind;
	covers: ShareCover[];
}

export const OG_COVER_LIMIT = 3;

const PADDING = 64;
const LEFT_COLUMN_WIDTH = 540;
const COVER_WIDTH = 196;
const COVER_HEIGHT = 294;
const USERNAME_MAX_LENGTH = 22;
const TALLY_SIZES = { labelSize: 26, valueSize: 42, dotSize: 5 };
interface FanSlot {
	coverIndex: number;
	left: number;
	top: number;
	rotate: number;
}

const FAN_LAYOUTS: Record<number, FanSlot[]> = {
	1: [{ coverIndex: 0, left: 168, top: 104, rotate: 0 }],
	2: [
		{ coverIndex: 1, left: 250, top: 112, rotate: 8 },
		{ coverIndex: 0, left: 86, top: 104, rotate: -6 }
	],
	3: [
		{ coverIndex: 1, left: 28, top: 124, rotate: -11 },
		{ coverIndex: 2, left: 308, top: 124, rotate: 11 },
		{ coverIndex: 0, left: 168, top: 92, rotate: 0 }
	]
};

function leftColumn(rewind: Rewind): SatoriElement {
	return box(
		{ flexDirection: "column", width: LEFT_COLUMN_WIDTH, flexShrink: 0 },
		[
			box({ alignItems: "center", gap: 24 }, [
				wordmark(24),
				singleLine(
					{
						fontFamily: SHARE_FONT_FAMILY.text,
						fontWeight: 600,
						fontSize: 24,
						color: SHARE_COLORS.secondary,
						maxWidth: 300
					},
					`@${displayText(rewind.user.username, USERNAME_MAX_LENGTH)}`
				)
			]),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: 34,
					color: SHARE_COLORS.secondary,
					marginTop: 30
				},
				"Rewind"
			),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: 196,
					lineHeight: 0.86,
					letterSpacing: "-0.04em",
					color: SHARE_COLORS.foreground,
					marginLeft: -8,
					marginTop: 6
				},
				String(rewind.year)
			),
			box(
				{ flexDirection: "column", gap: 10, marginTop: 30 },
				tallyEntries(rewind.totals).map(entry =>
					tallyRow(entry, TALLY_SIZES)
				)
			)
		]
	);
}

function coverFan(covers: ShareCover[]): SatoriElement[] {
	const slots = FAN_LAYOUTS[covers.length] ?? [];
	return slots.flatMap(({ coverIndex, left, top, rotate }) => {
		const cover = covers[coverIndex];
		if (!cover) return [];
		return [
			coverCard(cover, COVER_WIDTH, COVER_HEIGHT, {
				position: "absolute",
				left,
				top,
				transform: `rotate(${rotate}deg)`
			})
		];
	});
}

function rightColumn(rewind: Rewind, covers: ShareCover[]): SatoriElement {
	if (covers.length === 0) {
		return box({ flexGrow: 1, alignItems: "center", paddingLeft: 56 }, [
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 600,
					fontSize: 52,
					lineHeight: 1.1,
					color: SHARE_COLORS.foreground
				},
				rewindSummary(rewind.totals)
			)
		]);
	}
	return box({ position: "relative", flexGrow: 1 }, coverFan(covers));
}

export function ogTemplate({ rewind, covers }: OgTemplateInput): SatoriElement {
	return box(
		{
			position: "relative",
			width: SHARE_IMAGE_SIZES.og.width,
			height: SHARE_IMAGE_SIZES.og.height,
			padding: PADDING,
			backgroundColor: SHARE_COLORS.canvas,
			overflow: "hidden"
		},
		[
			brandGlow(900, { top: -420, right: -300 }),
			leftColumn(rewind),
			rightColumn(rewind, covers)
		]
	);
}
