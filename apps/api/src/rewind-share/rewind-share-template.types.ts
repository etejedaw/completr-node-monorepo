import { type RewindDesign } from "../rewind-editions/rewind-editions.constants";
import { type RewindImageFormat } from "./rewind-share.constants";
import {
	type SatoriElement,
	type ShareFormatTemplate
} from "./rewind-share-template.interface";

export type SatoriStyle = Record<string, string | number>;

export type SatoriChild = SatoriElement | string;

export type FallbackContent = (title: string, width: number) => SatoriChild[];

export type CreditsArrangement = "stacked" | "billed";

export type CoverMarkerSide = "flex-start" | "center" | "flex-end";

export type ShareDesignTemplates = Record<
	RewindImageFormat,
	ShareFormatTemplate
>;

export type ShareDesignCatalog = Record<RewindDesign, ShareDesignTemplates>;
