import { type Rewind } from "../rewind/rewind.interface";
import { type ShareArtwork, type ShareCover } from "./rewind-share.interface";
import {
	type SatoriChild,
	type SatoriStyle
} from "./rewind-share-template.types";

export interface OgTemplateInput {
	rewind: Rewind;
	artwork: ShareArtwork;
}

export interface PersonaBadgeSizes {
	titleSize: number;
	phraseSize: number;
}

export interface StatTile {
	label: string;
	value: string;
	color: string;
}

export interface TileBoxStyle {
	valueSize: number;
	labelSize: number;
	width: number | string;
	height: number;
	stacked: boolean;
}

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

export interface FanSlot {
	cover: ShareCover;
	offset: number;
}

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

export interface BackgroundLayer {
	image: string;
	size: string;
}

export interface StoryTemplateInput {
	rewind: Rewind;
	artwork: ShareArtwork;
	host: string;
}
