import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCopy, type ShareCover } from "../rewind-share.interface";
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

export interface CanvasSize {
	width: number;
	height: number;
}

const COVER_TITLE_MAX_LENGTH = 60;
const YEAR_GRADIENT = `linear-gradient(100deg, #ddd6fe 0%, ${SHARE_COLORS.brandLight} 28%, ${SHARE_COLORS.pink} 64%, ${SHARE_COLORS.orange} 100%)`;
const FILL: SatoriStyle = {
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0
};

export function box(
	style: SatoriStyle,
	children?: SatoriChild | SatoriChild[]
): SatoriElement {
	return {
		type: "div",
		props: {
			style: { display: "flex", boxSizing: "border-box", ...style },
			children
		}
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

export function diamond(size: number, color: string): SatoriElement {
	return box({
		width: size,
		height: size,
		flexShrink: 0,
		borderRadius: size * 0.22,
		backgroundColor: color,
		transform: "rotate(45deg)"
	});
}

export function wordmark(fontSize: number): SatoriElement {
	return box({ alignItems: "center", gap: fontSize * 0.45 }, [
		diamond(fontSize * 0.62, SHARE_COLORS.brand),
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

export function gradientYear(year: number, fontSize: number): SatoriElement {
	return text(
		{
			fontFamily: SHARE_FONT_FAMILY.display,
			fontWeight: 700,
			fontSize,
			lineHeight: 0.84,
			letterSpacing: "-0.045em",
			marginLeft: -fontSize * 0.05,
			paddingRight: fontSize * 0.06,
			backgroundImage: YEAR_GRADIENT,
			backgroundClip: "text",
			color: "transparent"
		},
		String(year)
	);
}

interface BackgroundLayer {
	image: string;
	size: string;
}

const FULL_SIZE = "100% 100%";

const COLOR_BLOBS: BackgroundLayer[] = [
	{
		image: "radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.6) 0%, rgba(139, 92, 246, 0) 55%)",
		size: FULL_SIZE
	},
	{
		image: "radial-gradient(circle at 0% 55%, rgba(251, 113, 133, 0.34) 0%, rgba(251, 113, 133, 0) 45%)",
		size: FULL_SIZE
	},
	{
		image: "radial-gradient(circle at 100% 100%, rgba(45, 212, 191, 0.24) 0%, rgba(45, 212, 191, 0) 50%)",
		size: FULL_SIZE
	}
];

const ART_VEIL: BackgroundLayer = {
	image: "linear-gradient(180deg, rgba(10, 10, 12, 0.55) 0%, rgba(10, 10, 12, 0.7) 40%, rgba(10, 10, 12, 0.93) 100%)",
	size: FULL_SIZE
};

function artFit(size: CanvasSize): string {
	return size.height > size.width ? "auto 100%" : "100% auto";
}

function backdropLayers(
	art: string | null,
	size: CanvasSize
): BackgroundLayer[] {
	if (!art) return COLOR_BLOBS;
	return [
		ART_VEIL,
		...COLOR_BLOBS,
		{ image: `url(${art})`, size: artFit(size) }
	];
}

export function backdropStyle(
	art: string | null,
	size: CanvasSize
): SatoriStyle {
	const layers = backdropLayers(art, size);
	return {
		backgroundColor: SHARE_COLORS.canvas,
		backgroundImage: layers.map(layer => layer.image).join(", "),
		backgroundSize: layers.map(layer => layer.size).join(", "),
		backgroundPosition: "center",
		backgroundRepeat: "no-repeat"
	};
}

type FallbackContent = (title: string, width: number) => SatoriChild[];

const FALLBACK_STRIPES: SatoriElement = box({
	...FILL,
	opacity: 0.16,
	backgroundImage:
		"repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0px, rgba(255, 255, 255, 0.5) 1px, rgba(255, 255, 255, 0) 1px, rgba(255, 255, 255, 0) 9px)"
});

function titledFallback(title: string, width: number): SatoriChild[] {
	return [
		FALLBACK_STRIPES,
		box({ flexGrow: 1 }),
		text(
			{
				display: "block",
				fontFamily: SHARE_FONT_FAMILY.display,
				fontWeight: 700,
				fontSize: Math.round(width * 0.13),
				lineHeight: 1.05,
				color: "rgba(255, 255, 255, 0.94)",
				padding: Math.round(width * 0.08),
				lineClamp: 4
			},
			displayText(title, COVER_TITLE_MAX_LENGTH)
		)
	];
}

export type CoverMarkerSide = "flex-start" | "center" | "flex-end";

function markedFallback(side: CoverMarkerSide): FallbackContent {
	return (_title, width) => [
		FALLBACK_STRIPES,
		box(
			{
				flexGrow: 1,
				alignItems: "center",
				justifyContent: side,
				padding: `0px ${Math.round(width * 0.14)}px`
			},
			[diamond(Math.round(width * 0.16), "rgba(255, 255, 255, 0.85)")]
		)
	];
}

function coverFace(
	cover: ShareCover,
	width: number,
	height: number,
	fallbackContent: FallbackContent
): SatoriElement {
	const frame: SatoriStyle = {
		position: "relative",
		width,
		height,
		borderRadius: Math.round(width * 0.07),
		overflow: "hidden",
		backgroundColor: SHARE_COLORS.surface,
		border: "3px solid rgba(255, 255, 255, 0.18)"
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
			backgroundImage: titleGradient(cover.title)
		},
		fallbackContent(cover.title, width)
	);
}

function card(
	face: SatoriElement,
	width: number,
	height: number,
	style: SatoriStyle
): SatoriElement {
	return box(
		{
			width,
			height,
			flexShrink: 0,
			borderRadius: Math.round(width * 0.07),
			boxShadow: `0 ${Math.round(width * 0.06)}px ${Math.round(width * 0.07)}px rgba(0, 0, 0, 0.55)`,
			...style
		},
		[face]
	);
}

export function coverCard(
	cover: ShareCover,
	width: number,
	height: number,
	style: SatoriStyle = {}
): SatoriElement {
	return card(
		coverFace(cover, width, height, titledFallback),
		width,
		height,
		style
	);
}

export function partlyHiddenCoverCard(
	cover: ShareCover,
	width: number,
	height: number,
	markerSide: CoverMarkerSide,
	style: SatoriStyle = {}
): SatoriElement {
	return card(
		coverFace(cover, width, height, markedFallback(markerSide)),
		width,
		height,
		style
	);
}

export function ownerLabel(
	username: string,
	copy: ShareCopy,
	fontSize: number
): SatoriElement {
	return text(
		{
			fontFamily: SHARE_FONT_FAMILY.text,
			fontWeight: 600,
			fontSize,
			color: SHARE_COLORS.foreground,
			flexShrink: 0
		},
		copy.ownerLabel(username)
	);
}
