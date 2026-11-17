import { type Rewind, type RewindTotals } from "../../rewind/rewind.interface";
import {
	SHARE_COLORS,
	SHARE_FONT_FAMILY,
	SHARE_IMAGE_SIZES
} from "../rewind-share.constants";
import { type Share2025Copy, type ShareCover } from "../rewind-share.interface";
import {
	type CoverCollageLayout,
	type SatoriElement,
	type StoryTemplateInput,
	type TallyFigure
} from "../rewind-share-template.interface";
import { displayText } from "../utils/display-text.util";
import { formatCount } from "../utils/format-count.util";
import { formatHours } from "../utils/format-hours.util";
import { formatRating } from "../utils/format-rating.util";
import { shareCopy } from "../utils/share-copy.util";
import { shareCopy2025 } from "../utils/share-copy-2025.util";
import { box, diamond, image, text, wordmark } from "./elements.template";

export const OG_2025_COVER_LIMIT = 12;

const { width: OG_WIDTH, height: OG_HEIGHT } = SHARE_IMAGE_SIZES.og;
const PADDING_X = 56;
const PADDING_TOP = 48;
const PADDING_BOTTOM = 44;
const TEXT_PANEL_WIDTH = 650;
const TEXT_PANEL_GUTTER = 40;
const YEAR_SIZE = 200;
const USERNAME_MAX_LENGTH = 22;
const RATING_SCALE = 5;
const HOURS_SUFFIX = "h";
const HAIRLINE = "1px solid rgba(255, 255, 255, 0.18)";
const CELL_DIVIDER = "1px solid rgba(255, 255, 255, 0.14)";
const YEAR_GRADIENT = `linear-gradient(90deg, ${SHARE_COLORS.brand} 0%, ${SHARE_COLORS.navQueue} 55%, ${SHARE_COLORS.navShelf} 100%)`;
const ART_FADE =
	"linear-gradient(90deg, #0a0a0c 0%, rgba(10, 10, 12, 0) 30%), linear-gradient(180deg, rgba(10, 10, 12, 0) 60%, rgba(10, 10, 12, 0.55) 100%)";
const COLLAGE_LAYOUT: CoverCollageLayout = {
	columns: 5,
	rows: 4,
	tileWidth: 150,
	tileHeight: 225,
	gap: 12,
	top: -120,
	left: -60,
	tiltDegrees: -6
};
const SOLO_COVER = { width: 300, height: 450, top: 90, left: 150 };
const PERSONA = { markSize: 50, titleSize: 32, phraseSize: 17 };
const TALLY = {
	valueMaxSize: 46,
	labelSize: 11,
	cellPadding: 20,
	digitWidthEm: 0.6,
	suffixScale: 0.4
};

function collageRowShift(coverCount: number, columns: number): number {
	if (coverCount > columns) return columns;
	return Math.ceil(coverCount / 2);
}

function collageCover(
	covers: ShareCover[],
	row: number,
	column: number,
	layout: CoverCollageLayout
): ShareCover {
	const shift = collageRowShift(covers.length, layout.columns);
	return covers[(row * shift + column) % covers.length]!;
}

function collageTile(
	cover: ShareCover,
	layout: CoverCollageLayout
): SatoriElement {
	return box(
		{
			width: layout.tileWidth,
			height: layout.tileHeight,
			flexShrink: 0,
			borderRadius: 8,
			overflow: "hidden",
			backgroundColor: SHARE_COLORS.surface
		},
		[
			image(cover.dataUri!, layout.tileWidth, layout.tileHeight, {
				objectFit: "cover"
			})
		]
	);
}

function coverCollage(
	covers: ShareCover[],
	layout: CoverCollageLayout
): SatoriElement {
	return box(
		{
			position: "absolute",
			top: layout.top,
			left: layout.left,
			flexDirection: "column",
			gap: layout.gap,
			transform: `rotate(${layout.tiltDegrees}deg)`
		},
		Array.from({ length: layout.rows }, (_, row) =>
			box(
				{ gap: layout.gap },
				Array.from({ length: layout.columns }, (_, column) =>
					collageTile(collageCover(covers, row, column, layout), layout)
				)
			)
		)
	);
}

function soloCover(cover: ShareCover): SatoriElement {
	return box(
		{
			position: "absolute",
			top: SOLO_COVER.top,
			left: SOLO_COVER.left,
			width: SOLO_COVER.width,
			height: SOLO_COVER.height,
			borderRadius: 12,
			overflow: "hidden",
			transform: `rotate(${COLLAGE_LAYOUT.tiltDegrees}deg)`,
			boxShadow: "0 24px 40px rgba(0, 0, 0, 0.6)"
		},
		[
			image(cover.dataUri!, SOLO_COVER.width, SOLO_COVER.height, {
				objectFit: "cover"
			})
		]
	);
}

function artwork(coversWithArt: ShareCover[]): SatoriElement {
	const [onlyCover] = coversWithArt;
	if (coversWithArt.length === 1 && onlyCover) return soloCover(onlyCover);
	return coverCollage(coversWithArt, COLLAGE_LAYOUT);
}

function artPanel(coversWithArt: ShareCover[]): SatoriElement {
	const width = OG_WIDTH - TEXT_PANEL_WIDTH;
	return box(
		{
			position: "absolute",
			top: 0,
			left: TEXT_PANEL_WIDTH,
			width,
			height: OG_HEIGHT,
			overflow: "hidden"
		},
		[
			artwork(coversWithArt),
			box({
				position: "absolute",
				top: 0,
				left: 0,
				width,
				height: OG_HEIGHT,
				backgroundImage: ART_FADE
			})
		]
	);
}

function masthead(
	rewind: Rewind,
	copy: Share2025Copy,
	width: number
): SatoriElement {
	const username = displayText(rewind.user.username, USERNAME_MAX_LENGTH);
	return box(
		{
			width,
			justifyContent: "space-between",
			alignItems: "center",
			gap: 24,
			paddingBottom: 14,
			marginBottom: 14,
			borderBottom: HAIRLINE
		},
		[
			wordmark(18),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: 15,
					letterSpacing: "0.18em",
					whiteSpace: "nowrap",
					color: SHARE_COLORS.brandLight
				},
				copy.eyebrow(username).toUpperCase()
			)
		]
	);
}

function yearHeadline(year: number): SatoriElement {
	return text(
		{
			alignSelf: "flex-start",
			fontFamily: SHARE_FONT_FAMILY.display,
			fontWeight: 700,
			fontSize: YEAR_SIZE,
			lineHeight: 0.9,
			letterSpacing: "-0.03em",
			marginLeft: -YEAR_SIZE * 0.04,
			paddingRight: YEAR_SIZE * 0.04,
			backgroundImage: YEAR_GRADIENT,
			backgroundClip: "text",
			color: "transparent"
		},
		String(year)
	);
}

function personaMark(): SatoriElement {
	return box(
		{
			width: PERSONA.markSize,
			height: PERSONA.markSize,
			flexShrink: 0,
			alignItems: "center",
			justifyContent: "center",
			borderRadius: Math.round(PERSONA.markSize * 0.12),
			backgroundColor: SHARE_COLORS.brandSolid
		},
		[diamond(Math.round(PERSONA.markSize * 0.34), "#ffffff")]
	);
}

function personaLine(rewind: Rewind): SatoriElement {
	const { title, phrase } = shareCopy(rewind.language).personas[
		rewind.persona
	];
	return box({ alignItems: "center", gap: 14, marginTop: 6 }, [
		personaMark(),
		box({ flexDirection: "column", flexShrink: 1, gap: 4 }, [
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.display,
					fontWeight: 700,
					fontSize: PERSONA.titleSize,
					lineHeight: 1.05,
					color: SHARE_COLORS.foreground
				},
				title
			),
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 400,
					fontSize: PERSONA.phraseSize,
					lineHeight: 1.3,
					color: SHARE_COLORS.secondary
				},
				phrase
			)
		])
	]);
}

export function tallyFigures(
	totals: RewindTotals,
	copy: Share2025Copy,
	locale: string
): TallyFigure[] {
	const figures: TallyFigure[] = [
		{
			label: copy.tally.finished,
			value: formatCount(totals.finished, locale),
			suffix: null
		},
		{
			label: copy.tally.leftBehind,
			value: formatCount(totals.abandoned, locale),
			suffix: null
		},
		{
			label: copy.tally.hoursPlayed,
			value: formatHours(totals.hoursPlayed, locale),
			suffix: HOURS_SUFFIX
		}
	];
	if (totals.averageRating === null) return figures;
	return [
		...figures,
		{
			label: copy.tally.averageRating,
			value: formatRating(totals.averageRating, locale),
			suffix: `/${RATING_SCALE}`
		}
	];
}

function figureWidthEm(figure: TallyFigure): number {
	const suffixLength = figure.suffix?.length ?? 0;
	return (
		(figure.value.length + suffixLength * TALLY.suffixScale) *
		TALLY.digitWidthEm
	);
}

function tallyValueSize(figures: TallyFigure[], cellWidth: number): number {
	const widestEm = Math.max(...figures.map(figureWidthEm));
	return Math.min(
		TALLY.valueMaxSize,
		Math.floor((cellWidth - TALLY.cellPadding) / widestEm)
	);
}

function tallyCell(
	figure: TallyFigure,
	isFirst: boolean,
	cellWidth: number,
	valueSize: number
): SatoriElement {
	return box(
		{
			width: cellWidth,
			flexDirection: "column",
			gap: 10,
			paddingTop: 16,
			paddingLeft: isFirst ? 0 : TALLY.cellPadding,
			borderLeft: isFirst ? "none" : CELL_DIVIDER,
			overflow: "hidden"
		},
		[
			text(
				{
					fontFamily: SHARE_FONT_FAMILY.text,
					fontWeight: 600,
					fontSize: TALLY.labelSize,
					letterSpacing: "0.14em",
					whiteSpace: "nowrap",
					color: SHARE_COLORS.secondary
				},
				figure.label.toUpperCase()
			),
			box({ alignItems: "baseline", gap: 4 }, [
				text(
					{
						fontFamily: SHARE_FONT_FAMILY.display,
						fontWeight: 700,
						fontSize: valueSize,
						lineHeight: 0.9,
						letterSpacing: "-0.02em",
						color: SHARE_COLORS.foreground
					},
					figure.value
				),
				...(figure.suffix
					? [
							text(
								{
									fontFamily: SHARE_FONT_FAMILY.display,
									fontWeight: 600,
									fontSize: Math.round(
										valueSize * TALLY.suffixScale
									),
									color: SHARE_COLORS.muted
								},
								figure.suffix
							)
						]
					: [])
			])
		]
	);
}

function tallyBand(figures: TallyFigure[], width: number): SatoriElement {
	const cellWidth = width / figures.length;
	const valueSize = tallyValueSize(figures, cellWidth);
	return box(
		{ width, borderTop: `3px solid ${SHARE_COLORS.foreground}` },
		figures.map((figure, index) =>
			tallyCell(figure, index === 0, cellWidth, valueSize)
		)
	);
}

function textPanel(rewind: Rewind, panelWidth: number): SatoriElement {
	const copy = shareCopy2025(rewind.language);
	const { numberLocale } = shareCopy(rewind.language);
	const contentWidth = panelWidth - PADDING_X - TEXT_PANEL_GUTTER;
	return box(
		{
			position: "absolute",
			top: 0,
			left: 0,
			width: panelWidth,
			height: OG_HEIGHT,
			padding: `${PADDING_TOP}px 0px ${PADDING_BOTTOM}px ${PADDING_X}px`,
			flexDirection: "column",
			justifyContent: "space-between"
		},
		[
			box({ flexDirection: "column", gap: 10, width: contentWidth }, [
				masthead(rewind, copy, contentWidth),
				yearHeadline(rewind.year),
				personaLine(rewind)
			]),
			tallyBand(
				tallyFigures(rewind.totals, copy, numberLocale),
				contentWidth
			)
		]
	);
}

export function og2025Template({
	rewind,
	artwork
}: StoryTemplateInput): SatoriElement {
	const coversWithArt = artwork.covers.filter(cover => cover.dataUri);
	const hasArt = coversWithArt.length > 0;
	const panelWidth = hasArt
		? TEXT_PANEL_WIDTH
		: OG_WIDTH - PADDING_X + TEXT_PANEL_GUTTER;
	return box(
		{
			position: "relative",
			width: OG_WIDTH,
			height: OG_HEIGHT,
			overflow: "hidden",
			backgroundColor: SHARE_COLORS.canvas
		},
		[
			...(hasArt ? [artPanel(coversWithArt)] : []),
			textPanel(rewind, panelWidth)
		]
	);
}
