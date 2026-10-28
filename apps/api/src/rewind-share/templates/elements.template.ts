import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import { displayText } from "../utils/display-text.util";
import { titleGradient } from "../utils/title-gradient.util";

export type SatoriStyle = Record<string, string | number>;
export type SatoriChild = SatoriElement | string;

export interface SatoriElement {
	type: string;
	props: {
		style?: SatoriStyle;
		children?: SatoriChild | SatoriChild[];
		src?: string;
		width?: number;
		height?: number;
	};
}

export interface TallyEntry {
	label: string;
	value: string;
	color: string;
}

export interface TallySizes {
	labelSize: number;
	valueSize: number;
	dotSize: number;
}

const DOTS_PER_ROW = 80;
const COVER_TITLE_MAX_LENGTH = 60;
const STAR_PATH =
	"M12 2.5l2.94 6.08 6.56.95-4.75 4.63 1.12 6.53L12 17.6l-5.87 3.09 1.12-6.53L2.5 9.53l6.56-.95z";

export function box(
	style: SatoriStyle,
	children?: SatoriChild | SatoriChild[]
): SatoriElement {
	return {
		type: "div",
		props: { style: { display: "flex", ...style }, children }
	};
}

export function text(style: SatoriStyle, content: string): SatoriElement {
	return box(style, content);
}

export function image(
	src: string,
	width: number,
	height: number,
	style: SatoriStyle = {}
): SatoriElement {
	return {
		type: "img",
		props: { src, width, height, style: { width, height, ...style } }
	};
}

export function singleLine(style: SatoriStyle, content: string): SatoriElement {
	return text(
		{
			display: "block",
			overflow: "hidden",
			whiteSpace: "nowrap",
			textOverflow: "ellipsis",
			...style
		},
		content
	);
}

export function wordmark(fontSize: number): SatoriElement {
	return box({ alignItems: "center", gap: fontSize * 0.45 }, [
		box({
			width: fontSize * 0.62,
			height: fontSize * 0.62,
			borderRadius: fontSize * 0.16,
			backgroundColor: SHARE_COLORS.brand,
			transform: "rotate(45deg)"
		}),
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 700,
				fontSize,
				letterSpacing: "0.14em",
				color: SHARE_COLORS.foreground
			},
			"COMPLETR"
		)
	]);
}

export function brandGlow(size: number, style: SatoriStyle): SatoriElement {
	return box({
		position: "absolute",
		width: size,
		height: size,
		backgroundImage: `radial-gradient(circle at center, ${SHARE_COLORS.brandGlow} 0%, rgba(139, 92, 246, 0) 68%)`,
		...style
	});
}

export function starIcon(size: number, color: string): SatoriElement {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${STAR_PATH}"/></svg>`;
	return image(
		`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
		size,
		size
	);
}

function coverFallback(title: string, width: number): SatoriChild[] {
	return [
		box({
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			opacity: 0.16,
			backgroundImage:
				"repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0px, rgba(255, 255, 255, 0.5) 1px, rgba(255, 255, 255, 0) 1px, rgba(255, 255, 255, 0) 9px)"
		}),
		text(
			{
				display: "block",
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 700,
				fontSize: Math.round(width * 0.12),
				lineHeight: 1.05,
				color: "rgba(255, 255, 255, 0.92)",
				padding: Math.round(width * 0.08),
				lineClamp: 4
			},
			displayText(title, COVER_TITLE_MAX_LENGTH)
		)
	];
}

export function coverCard(
	cover: ShareCover,
	width: number,
	height: number,
	style: SatoriStyle = {}
): SatoriElement {
	const radius = Math.round(width * 0.086);
	const frame: SatoriStyle = {
		position: "relative",
		width,
		height,
		flexShrink: 0,
		borderRadius: radius,
		overflow: "hidden",
		backgroundColor: SHARE_COLORS.surface,
		border: "2px solid rgba(255, 255, 255, 0.08)",
		boxShadow: "0 24px 48px rgba(0, 0, 0, 0.55)",
		...style
	};

	if (cover.dataUri) {
		return box(frame, [
			image(cover.dataUri, width, height, { objectFit: "cover" })
		]);
	}
	return box(
		{
			...frame,
			flexDirection: "column",
			justifyContent: "flex-end",
			backgroundImage: titleGradient(cover.title)
		},
		coverFallback(cover.title, width)
	);
}

function dottedLeader(dotSize: number): SatoriElement {
	const dots = Array.from({ length: DOTS_PER_ROW }, () =>
		box({
			width: dotSize,
			height: dotSize,
			flexShrink: 0,
			borderRadius: dotSize,
			backgroundColor: SHARE_COLORS.dots
		})
	);
	return box(
		{
			flexGrow: 1,
			flexShrink: 1,
			flexBasis: 0,
			minWidth: 0,
			overflow: "hidden",
			gap: dotSize * 1.6,
			marginLeft: dotSize * 3,
			marginRight: dotSize * 3,
			marginBottom: dotSize * 2.2
		},
		dots
	);
}

export function tallyRow(entry: TallyEntry, sizes: TallySizes): SatoriElement {
	return box({ alignItems: "flex-end", width: "100%" }, [
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.text,
				fontWeight: 600,
				fontSize: sizes.labelSize,
				color: SHARE_COLORS.secondary,
				flexShrink: 0,
				paddingBottom: sizes.labelSize * 0.12
			},
			entry.label
		),
		dottedLeader(sizes.dotSize),
		text(
			{
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 600,
				fontSize: sizes.valueSize,
				lineHeight: 1,
				color: entry.color,
				flexShrink: 0
			},
			entry.value
		)
	]);
}
