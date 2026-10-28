import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import { displayText } from "../utils/display-text.util";
import { formatRating } from "../utils/format-count.util";
import { rewindSummary } from "../utils/rewind-summary.util";
import {
	box,
	brandGlow,
	coverCard,
	type SatoriChild,
	type SatoriElement,
	singleLine,
	starIcon,
	tallyRow,
	text,
	wordmark
} from "./elements.template";
import { platinumEntry, tallyEntries } from "./tally-entries.template";

export interface StoryTemplateInput {
	rewind: Rewind;
	covers: ShareCover[];
	host: string;
}

export const STORY_COVER_LIMIT = 4;

const SIDE_PADDING = 96;
const CONTENT_WIDTH = SHARE_IMAGE_SIZES.story.width - SIDE_PADDING * 2;
const TOP_SAFE_AREA = 220;
const BOTTOM_SAFE_AREA = 280;
const FOOTER_OFFSET = 56;
const COVER_WIDTH = 210;
const COVER_HEIGHT = 315;
const COVER_STAGGER = [0, 24, 8, 32];
const USERNAME_MAX_LENGTH = 22;
const DETAIL_VALUE_MAX_LENGTH = 40;
const TALLY_SIZES = { labelSize: 40, valueSize: 64, dotSize: 7 };

function header(username: string): SatoriElement {
	return box(
		{
			justifyContent: "space-between",
			alignItems: "center",
			width: CONTENT_WIDTH
		},
		[
			wordmark(36),
			singleLine(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: 36,
					color: SHARE_COLORS.secondary,
					maxWidth: 480
				},
				`@${displayText(username, USERNAME_MAX_LENGTH)}`
			)
		]
	);
}

function yearBlock(year: number): SatoriElement {
	return box({ flexDirection: "column", marginTop: 44 }, [
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.text,
				fontWeight: 600,
				fontSize: 56,
				color: SHARE_COLORS.secondary
			},
			"Rewind"
		),
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 700,
				fontSize: 300,
				lineHeight: 0.86,
				letterSpacing: "-0.04em",
				color: SHARE_COLORS.foreground,
				marginLeft: -14,
				marginTop: 12
			},
			String(year)
		)
	]);
}

function coverRow(covers: ShareCover[], rewind: Rewind): SatoriElement {
	if (covers.length === 0) {
		return text(
			{
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 600,
				fontSize: 88,
				lineHeight: 1.05,
				color: SHARE_COLORS.foreground,
				marginTop: 72,
				width: CONTENT_WIDTH
			},
			rewindSummary(rewind.totals)
		);
	}
	return box(
		{
			gap: 16,
			marginTop: 60,
			height: COVER_HEIGHT + Math.max(...COVER_STAGGER)
		},
		covers.map((cover, index) =>
			coverCard(cover, COVER_WIDTH, COVER_HEIGHT, {
				marginTop: COVER_STAGGER[index] ?? 0
			})
		)
	);
}

function detailRow(label: string, value: SatoriChild[]): SatoriElement {
	return box({ alignItems: "center", gap: 28, width: "100%" }, [
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.text,
				fontWeight: 600,
				fontSize: 36,
				color: SHARE_COLORS.secondary,
				flexShrink: 0
			},
			label
		),
		box(
			{
				alignItems: "center",
				gap: 16,
				flexGrow: 1,
				flexShrink: 1,
				overflow: "hidden",
				justifyContent: "flex-end"
			},
			value
		)
	]);
}

function detailValue(content: string): SatoriElement {
	return singleLine(
		{
			fontFamily: SHARE_FONT_FAMILY.display,
			fontWeight: 600,
			fontSize: 46,
			color: SHARE_COLORS.foreground,
			flexShrink: 1
		},
		displayText(content, DETAIL_VALUE_MAX_LENGTH)
	);
}

function detailRows(rewind: Rewind): SatoriElement[] {
	const { favoriteGenre, topRated } = rewind.highlights;
	const rows: SatoriElement[] = [];
	if (favoriteGenre)
		rows.push(
			detailRow("Favorite genre", [detailValue(favoriteGenre.name)])
		);
	if (topRated) {
		rows.push(
			detailRow("Top rated", [
				detailValue(topRated.title),
				box({ alignItems: "center", gap: 8, flexShrink: 0 }, [
					starIcon(40, SHARE_COLORS.brand),
					text(
						{
							fontFamily: SHARE_FONT_FAMILY.display,
							fontWeight: 600,
							fontSize: 46,
							color: SHARE_COLORS.brand
						},
						formatRating(topRated.userRating)
					)
				])
			])
		);
	}
	return rows;
}

function results(rewind: Rewind): SatoriElement {
	const platinums = platinumEntry(rewind.totals);
	const entries = platinums
		? [...tallyEntries(rewind.totals), platinums]
		: tallyEntries(rewind.totals);
	const details = detailRows(rewind);

	return box(
		{
			flexDirection: "column",
			marginTop: 60,
			gap: 12,
			width: CONTENT_WIDTH
		},
		[
			...entries.map(entry => tallyRow(entry, TALLY_SIZES)),
			...(details.length > 0
				? [
						box(
							{
								flexDirection: "column",
								gap: 16,
								marginTop: 24,
								paddingTop: 30,
								borderTop: `2px solid ${SHARE_COLORS.dots}`
							},
							details
						)
					]
				: [])
		]
	);
}

function footer(host: string): SatoriElement {
	return text(
		{
			position: "absolute",
			left: SIDE_PADDING,
			top:
				SHARE_IMAGE_SIZES.story.height -
				BOTTOM_SAFE_AREA +
				FOOTER_OFFSET,
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
	covers,
	host
}: StoryTemplateInput): SatoriElement {
	return box(
		{
			position: "relative",
			flexDirection: "column",
			width: SHARE_IMAGE_SIZES.story.width,
			height: SHARE_IMAGE_SIZES.story.height,
			padding: `${TOP_SAFE_AREA}px ${SIDE_PADDING}px 0px`,
			backgroundColor: SHARE_COLORS.canvas,
			overflow: "hidden"
		},
		[
			brandGlow(1200, { top: -520, right: -520 }),
			header(rewind.user.username),
			yearBlock(rewind.year),
			coverRow(covers, rewind),
			results(rewind),
			footer(host)
		]
	);
}
