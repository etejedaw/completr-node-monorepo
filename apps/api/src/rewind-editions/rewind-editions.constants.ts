export const REWIND_DESIGNS = ["2026"] as const;

export type RewindDesign = (typeof REWIND_DESIGNS)[number];

export const DEFAULT_REWIND_DESIGN: RewindDesign = "2026";
