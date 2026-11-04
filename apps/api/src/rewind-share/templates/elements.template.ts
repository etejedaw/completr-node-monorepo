import { SHARE_COLORS, SHARE_FONT_FAMILY } from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import { type SatoriElement } from "../rewind-share-template.interface";
import {
	type CoverMarkerSide,
	type FallbackContent,
	type SatoriChild,
	type SatoriStyle
} from "../rewind-share-template.types";
import { displayText } from "../utils/display-text.util";
import { titleGradient } from "../utils/title-gradient.util";

const COVER_TITLE_MAX_LENGTH = 60;
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

export function wordmark(
	fontSize: number,
	diamondColor: string = SHARE_COLORS.brand
): SatoriElement {
	return box({ alignItems: "center", gap: fontSize * 0.45 }, [
		diamond(fontSize * 0.62, diamondColor),
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
