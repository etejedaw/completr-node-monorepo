import { type SatoriElement } from "./rewind-share-template.interface";

export type SatoriStyle = Record<string, string | number>;

export type SatoriChild = SatoriElement | string;

export type FallbackContent = (title: string, width: number) => SatoriChild[];

export type CoverMarkerSide = "flex-start" | "center" | "flex-end";
