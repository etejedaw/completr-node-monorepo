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

export interface StatTile {
	label: string;
	value: string;
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

export interface BrandBandLayout {
	top: number;
	width: number;
	height: number;
	paddingX: number;
	wordmarkSize: number;
	labelSize: number;
}

export interface TotalCountSizes {
	maxSize: number;
	widthBudget: number;
	labelSize: number;
	labelMaxWidth: number;
	captionSize: number;
	gap: number;
}

export interface PersonaLineSizes {
	chipSize: number;
	phraseSize: number;
	gap: number;
}

export interface InlineStatSizes {
	valueSize: number;
	labelSize: number;
	gap: number;
}

export interface CoverMosaicLayout {
	columns: number;
	rows: number;
	tileWidth: number;
	tileHeight: number;
	gap: number;
	top: number;
	left: number;
	tiltDegrees: number;
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

export interface StoryTemplateInput {
	rewind: Rewind;
	artwork: ShareArtwork;
	host: string;
}
