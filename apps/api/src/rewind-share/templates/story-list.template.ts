import { type Rewind } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type ShareCopy, type ShareCover } from "../rewind-share.interface";
import {
	type CreditLine,
	type SatoriElement,
	type StoryListCredits,
	type StoryTemplateInput
} from "../rewind-share-template.interface";
import { type SatoriStyle } from "../rewind-share-template.types";
import { countLabel } from "../utils/count-label.util";
import { displayText } from "../utils/display-text.util";
import { formatCount } from "../utils/format-count.util";
import { removeReleaseYear } from "../utils/remove-release-year.util";
import { shareCopy } from "../utils/share-copy.util";
import { duotoneCoverMosaic } from "./cover-mosaic.template";
import { box, diamond, text } from "./elements.template";
import { brandBand, COUNT_GRADIENT } from "./rewind-blocks.template";

export const STORY_LIST_COVER_LIMIT = 12;
export const STORY_LIST_CAPACITY = 21;

const { width: CANVAS_WIDTH, height: CANVAS_HEIGHT } =
	SHARE_IMAGE_SIZES["story-list"];
const SIDE_PADDING = 80;
const INNER_WIDTH = CANVAS_WIDTH - SIDE_PADDING * 2;
const BOTTOM_SAFE_AREA = 280;
const FOOTER_OFFSET = 70;
const PAGE_MARKER = "2 / 2";
const BAND_LAYOUT = {
	top: 150,
	width: CANVAS_WIDTH,
	height: 104,
	paddingX: SIDE_PADDING,
	wordmarkSize: 34,
	labelSize: 30
};
const STRIP_TOP = BAND_LAYOUT.top + BAND_LAYOUT.height;
const STRIP_HEIGHT = 480;
const STRIP_FADE =
	"linear-gradient(180deg, rgba(10, 10, 12, 0.15) 0%, rgba(10, 10, 12, 0.35) 45%, #0a0a0c 100%)";
const STRIP_FALLBACK_GLOW =
	"radial-gradient(circle at 85% 0%, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0) 60%)";
const MOSAIC_LAYOUT = {
	columns: 6,
	rows: 3,
	tileWidth: 230,
	tileHeight: 306,
	gap: 18,
	top: -140,
	left: -260,
	tiltDegrees: -9
};
const TITLE_TOP = 450;
const HEADLINE_MAX_SIZE = 150;
const HEADLINE_WIDTH_PER_CHARACTER = 0.52;
const CREDITS_TOP = 790;
const CREDITS_HEIGHT = 760;
const CREDITS_HEADER_HEIGHT = 38;
const STATS_TOP = 1586;
const USERNAME_MAX_LENGTH = 22;
const TITLE_MAX_LENGTH = 60;
const LINE_WIDTH_PER_CHARACTER = 0.66;
const STACKED = {
	lineLimit: 6,
	fontSize: 62,
	lineHeight: 1.05,
	gap: 22,
	maxRowsPerLine: 2
};
const BILLED = {
	fontSize: 30,
	lineHeight: 1.25,
	columnGap: 14,
	rowGap: 2,
	separatorGap: 16,
	separatorSize: 9,
	maxRows: 17
};

function estimatedTextWidth(content: string, fontSize: number): number {
	return Array.from(content).length * fontSize * LINE_WIDTH_PER_CHARACTER;
}

function creditTitle(title: string, locale: string): string {
	return displayText(
		removeReleaseYear(title),
		TITLE_MAX_LENGTH
	).toLocaleUpperCase(locale);
}

function overflowLine(hiddenCount: number, copy: ShareCopy): CreditLine {
	const { gamesList } = copy;
	const count = formatCount(hiddenCount, copy.numberLocale);
	return {
		text: `${gamesList.and} ${count} ${countLabel(hiddenCount, gamesList.moreGames)}`,
		isOverflow: true
	};
}

function creditLines(
	titles: string[],
	shownCount: number,
	copy: ShareCopy
): CreditLine[] {
	const lines = titles
		.slice(0, shownCount)
		.map(title => ({ text: title, isOverflow: false }));
	const hiddenCount = titles.length - shownCount;
	return hiddenCount > 0
		? [...lines, overflowLine(hiddenCount, copy)]
		: lines;
}

function stackedRows(line: CreditLine): number {
	const rows = Math.ceil(
		estimatedTextWidth(line.text, STACKED.fontSize) / INNER_WIDTH
	);
	return Math.min(STACKED.maxRowsPerLine, Math.max(1, rows));
}

function fitsStacked(lines: CreditLine[]): boolean {
	if (lines.length > STACKED.lineLimit) return false;
	const rows = lines.reduce((total, line) => total + stackedRows(line), 0);
	const height =
		rows * STACKED.fontSize * STACKED.lineHeight +
		(lines.length - 1) * STACKED.gap;
	return CREDITS_HEADER_HEIGHT + height <= CREDITS_HEIGHT;
}

function billedItemWidth(line: CreditLine, isLast: boolean): number {
	const separator = isLast ? 0 : BILLED.separatorGap + BILLED.separatorSize;
	return Math.min(
		INNER_WIDTH,
		estimatedTextWidth(line.text, BILLED.fontSize) + separator
	);
}

function billedRows(lines: CreditLine[]): number {
	let rows = 0;
	let rowWidth = 0;
	lines.forEach((line, index) => {
		const width = billedItemWidth(line, index === lines.length - 1);
		if (rows > 0 && rowWidth + BILLED.columnGap + width <= INNER_WIDTH) {
			rowWidth += BILLED.columnGap + width;
			return;
		}
		rows += 1;
		rowWidth = width;
	});
	return rows;
}

function initialShownCount(total: number): number {
	return total <= STORY_LIST_CAPACITY ? total : STORY_LIST_CAPACITY - 1;
}

export function storyListCredits(
	rewind: Rewind,
	copy: ShareCopy
): StoryListCredits {
	const titles = rewind.finishedGames.map(game =>
		creditTitle(game.title, copy.numberLocale)
	);
	let shownCount = initialShownCount(titles.length);
	const firstLines = creditLines(titles, shownCount, copy);
	if (fitsStacked(firstLines))
		return { arrangement: "stacked", lines: firstLines };

	while (
		shownCount > 1 &&
		billedRows(creditLines(titles, shownCount, copy)) > BILLED.maxRows
	)
		shownCount -= 1;
	return {
		arrangement: "billed",
		lines: creditLines(titles, shownCount, copy)
	};
}

function spacedText(
	content: string,
	fontSize: number,
	color: string,
	letterSpacing: string,
	style: SatoriStyle = {}
): SatoriElement {
	return text(
		{
			fontFamily: SHARE_FONT_FAMILY.display,
			fontWeight: 700,
			fontSize,
			letterSpacing,
			color,
			...style
		},
		content
	);
}

function coverStrip(covers: ShareCover[]): SatoriElement {
	const size = { width: CANVAS_WIDTH, height: STRIP_HEIGHT };
	const mosaic = duotoneCoverMosaic(covers, MOSAIC_LAYOUT, size);
	return box(
		{
			position: "absolute",
			top: STRIP_TOP,
			left: 0,
			width: CANVAS_WIDTH,
			height: STRIP_HEIGHT,
			overflow: "hidden",
			...(mosaic.length === 0 && { backgroundImage: STRIP_FALLBACK_GLOW })
		},
		[
			...mosaic,
			box({
				position: "absolute",
				top: 0,
				left: 0,
				width: CANVAS_WIDTH,
				height: STRIP_HEIGHT,
				backgroundImage: STRIP_FADE
			})
		]
	);
}

function headlineSize(headline: string): number {
	return Math.min(
		HEADLINE_MAX_SIZE,
		Math.floor(
			INNER_WIDTH /
				(Array.from(headline).length * HEADLINE_WIDTH_PER_CHARACTER)
		)
	);
}

function titleBlock(rewind: Rewind, copy: ShareCopy): SatoriElement {
	const { gamesList, numberLocale } = copy;
	const count = rewind.finishedGames.length;
	const username = `@${displayText(rewind.user.username, USERNAME_MAX_LENGTH)}`;
	const headline = `${formatCount(count, numberLocale)} ${countLabel(count, gamesList.endings)}`;
	return box(
		{
			position: "absolute",
			top: TITLE_TOP,
			left: SIDE_PADDING,
			width: INNER_WIDTH,
			flexDirection: "column",
			alignItems: "center"
		},
		[
			spacedText(
				gamesList.presents(username.toLocaleUpperCase(numberLocale)),
				28,
				SHARE_COLORS.brandPale,
				"0.3em"
			),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: headlineSize(headline),
					lineHeight: 0.9,
					letterSpacing: "-0.03em",
					marginTop: 18,
					backgroundImage: COUNT_GRADIENT,
					backgroundClip: "text",
					color: "transparent"
				},
				headline
			),
			spacedText(gamesList.season(rewind.year), 30, "#ffffff", "0.22em", {
				marginTop: 18
			})
		]
	);
}

function creditColor(line: CreditLine, index: number): string {
	if (line.isOverflow) return SHARE_COLORS.brandLight;
	return index % 2 === 1 ? SHARE_COLORS.brandPale : "#ffffff";
}

function stackedLine(line: CreditLine, index: number): SatoriElement {
	return text(
		{
			display: "block",
			maxWidth: INNER_WIDTH,
			textAlign: "center",
			fontFamily: SHARE_FONT_FAMILY.display,
			fontWeight: 700,
			fontSize: STACKED.fontSize,
			lineHeight: STACKED.lineHeight,
			letterSpacing: "0.04em",
			color: creditColor(line, index),
			lineClamp: STACKED.maxRowsPerLine,
			overflow: "hidden"
		},
		line.text
	);
}

function billedLine(
	line: CreditLine,
	index: number,
	lines: CreditLine[]
): SatoriElement {
	const isLast = index === lines.length - 1;
	return box(
		{
			alignItems: "center",
			gap: BILLED.separatorGap,
			maxWidth: INNER_WIDTH
		},
		[
			text(
				{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					minWidth: 0,
					flexShrink: 1,
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: BILLED.fontSize,
					lineHeight: BILLED.lineHeight,
					letterSpacing: "0.04em",
					color: creditColor(line, index)
				},
				line.text
			),
			...(isLast
				? []
				: [diamond(BILLED.separatorSize, SHARE_COLORS.brand)])
		]
	);
}

function creditsBody(credits: StoryListCredits): SatoriElement {
	if (credits.arrangement === "stacked") {
		return box(
			{ flexDirection: "column", alignItems: "center", gap: STACKED.gap },
			credits.lines.map(stackedLine)
		);
	}
	return box(
		{
			width: INNER_WIDTH,
			flexWrap: "wrap",
			justifyContent: "center",
			columnGap: BILLED.columnGap,
			rowGap: BILLED.rowGap
		},
		credits.lines.map(billedLine)
	);
}

function credits(rewind: Rewind, copy: ShareCopy): SatoriElement {
	return box(
		{
			position: "absolute",
			top: CREDITS_TOP,
			left: SIDE_PADDING,
			width: INNER_WIDTH,
			height: CREDITS_HEIGHT,
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center"
		},
		[
			spacedText(
				copy.gamesList.starring,
				20,
				SHARE_COLORS.muted,
				"0.34em",
				{ marginBottom: 14 }
			),
			creditsBody(storyListCredits(rewind, copy))
		]
	);
}

function statSegments(rewind: Rewind, copy: ShareCopy): string[] {
	const { gamesList, numberLocale } = copy;
	const count = rewind.finishedGames.length;
	const hours = Math.round(rewind.totals.hoursPlayed);
	const { finishRate } = rewind.totals;
	return [
		`${formatCount(count, numberLocale)} ${countLabel(count, gamesList.finished)}`,
		...(hours > 0
			? [
					`${formatCount(hours, numberLocale)} ${countLabel(hours, gamesList.hours)}`
				]
			: []),
		...(finishRate === null
			? []
			: [
					`${formatCount(finishRate, numberLocale)}% ${gamesList.finishRate}`
				])
	];
}

function statsRow(rewind: Rewind, copy: ShareCopy): SatoriElement {
	const segments = statSegments(rewind, copy);
	return box(
		{
			position: "absolute",
			top: STATS_TOP,
			left: 0,
			width: CANVAS_WIDTH,
			padding: `0px ${SIDE_PADDING / 2}px`,
			flexWrap: "wrap",
			justifyContent: "center",
			alignItems: "center",
			columnGap: 26,
			rowGap: 12
		},
		segments.flatMap((segment, index) => [
			...(index > 0 ? [diamond(11, SHARE_COLORS.brandLight)] : []),
			spacedText(segment, 26, "#ffffff", "0.14em")
		])
	);
}

function footer(host: string): SatoriElement {
	return box(
		{
			position: "absolute",
			left: SIDE_PADDING,
			width: INNER_WIDTH,
			top: CANVAS_HEIGHT - BOTTOM_SAFE_AREA + FOOTER_OFFSET,
			justifyContent: "space-between",
			alignItems: "center"
		},
		[
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: 30,
					color: SHARE_COLORS.muted
				},
				host
			),
			spacedText(PAGE_MARKER, 22, SHARE_COLORS.faint, "0.22em")
		]
	);
}

export function storyListTemplate({
	rewind,
	artwork,
	host
}: StoryTemplateInput): SatoriElement {
	const copy = shareCopy(rewind.language);
	return box(
		{
			position: "relative",
			width: CANVAS_WIDTH,
			height: CANVAS_HEIGHT,
			overflow: "hidden",
			backgroundColor: SHARE_COLORS.canvas
		},
		[
			coverStrip(artwork.covers),
			brandBand(rewind.year, BAND_LAYOUT),
			titleBlock(rewind, copy),
			credits(rewind, copy),
			statsRow(rewind, copy),
			footer(host)
		]
	);
}
