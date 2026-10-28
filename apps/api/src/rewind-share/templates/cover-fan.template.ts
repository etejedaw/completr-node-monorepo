import { type ShareCover } from "../rewind-share.interface";
import {
	box,
	coverCard,
	type CoverMarkerSide,
	partlyHiddenCoverCard,
	type SatoriElement,
	type SatoriStyle
} from "./elements.template";

export interface CoverFanLayout {
	coverWidth: number;
	coverHeight: number;
	areaWidth: number;
	areaHeight: number;
	spreadX: number;
	dropY: number;
	tiltDegrees: number;
	shrinkPerStep: number;
}

interface FanSlot {
	cover: ShareCover;
	offset: number;
}

function fanSlots(covers: ShareCover[]): FanSlot[] {
	const center = (covers.length - 1) / 2;
	return covers
		.map((cover, index) => ({ cover, offset: index - center }))
		.sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
}

function slotPlacement(offset: number, layout: CoverFanLayout): SatoriStyle {
	const centeredLeft = (layout.areaWidth - layout.coverWidth) / 2;
	const centeredTop = (layout.areaHeight - layout.coverHeight) / 2;
	return {
		position: "absolute",
		left: Math.round(centeredLeft + offset * layout.spreadX),
		top: Math.round(centeredTop + Math.abs(offset) * layout.dropY),
		transform: `rotate(${offset * layout.tiltDegrees}deg) scale(${1 - Math.abs(offset) * layout.shrinkPerStep})`
	};
}

function frontCover(slot: FanSlot, layout: CoverFanLayout): SatoriElement {
	return coverCard(
		slot.cover,
		layout.coverWidth,
		layout.coverHeight,
		slotPlacement(slot.offset, layout)
	);
}

function visibleSide(offset: number): CoverMarkerSide {
	if (offset < 0) return "flex-start";
	if (offset > 0) return "flex-end";
	return "center";
}

function backCover(slot: FanSlot, layout: CoverFanLayout): SatoriElement {
	return partlyHiddenCoverCard(
		slot.cover,
		layout.coverWidth,
		layout.coverHeight,
		visibleSide(slot.offset),
		slotPlacement(slot.offset, layout)
	);
}

function placedCovers(
	covers: ShareCover[],
	layout: CoverFanLayout
): SatoriElement[] {
	const slots = fanSlots(covers);
	const front = slots.pop();
	if (!front) return [];
	return [
		...slots.map(slot => backCover(slot, layout)),
		frontCover(front, layout)
	];
}

function floorShadow(layout: CoverFanLayout): SatoriElement {
	return box({
		position: "absolute",
		left: 0,
		right: 0,
		bottom: -layout.areaHeight * 0.08,
		height: layout.areaHeight * 0.4,
		backgroundImage:
			"radial-gradient(ellipse at center, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 70%)"
	});
}

export function coverFan(
	covers: ShareCover[],
	layout: CoverFanLayout
): SatoriElement {
	return box(
		{
			position: "relative",
			width: layout.areaWidth,
			height: layout.areaHeight,
			flexShrink: 0
		},
		[floorShadow(layout), ...placedCovers(covers, layout)]
	);
}
