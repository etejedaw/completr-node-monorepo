import { SHARE_COLORS } from "../rewind-share.constants";
import { type ShareCover } from "../rewind-share.interface";
import {
	type CanvasSize,
	type CoverMosaicLayout,
	type SatoriElement
} from "../rewind-share-template.interface";
import { type SatoriStyle } from "../rewind-share-template.types";
import { box, image } from "./elements.template";

const DUOTONE_TINT = "#6d28d9";

function fillOf(size: CanvasSize): SatoriStyle {
	return {
		position: "absolute",
		top: 0,
		left: 0,
		width: size.width,
		height: size.height
	};
}

function tile(cover: ShareCover, layout: CoverMosaicLayout): SatoriElement {
	return box(
		{
			width: layout.tileWidth,
			height: layout.tileHeight,
			flexShrink: 0,
			borderRadius: Math.round(layout.tileWidth * 0.08),
			overflow: "hidden",
			backgroundColor: SHARE_COLORS.surface
		},
		cover.dataUri
			? [
					image(cover.dataUri, layout.tileWidth, layout.tileHeight, {
						objectFit: "cover"
					})
				]
			: []
	);
}

function mosaicRows(
	covers: ShareCover[],
	layout: CoverMosaicLayout
): SatoriElement[] {
	return Array.from({ length: layout.rows }, (_, row) => {
		const rowCovers = Array.from(
			{ length: layout.columns },
			(_, column) =>
				covers[(row * layout.columns + column) % covers.length]!
		);
		return box(
			{
				gap: layout.gap,
				marginLeft: row % 2 === 1 ? -layout.tileWidth / 2 : 0
			},
			rowCovers.map(cover => tile(cover, layout))
		);
	});
}

export function coversWithArt(covers: ShareCover[]): ShareCover[] {
	return covers.filter(cover => cover.dataUri);
}

export function duotoneCoverMosaic(
	covers: ShareCover[],
	layout: CoverMosaicLayout,
	size: CanvasSize
): SatoriElement[] {
	const withArt = coversWithArt(covers);
	if (withArt.length === 0) return [];
	return [
		box({ ...fillOf(size), filter: "grayscale(100%) contrast(1.1)" }, [
			box(
				{
					position: "absolute",
					top: layout.top,
					left: layout.left,
					flexDirection: "column",
					gap: layout.gap,
					transform: `rotate(${layout.tiltDegrees}deg)`
				},
				mosaicRows(withArt, layout)
			)
		]),
		box({
			...fillOf(size),
			backgroundColor: DUOTONE_TINT,
			mixBlendMode: "multiply"
		})
	];
}
