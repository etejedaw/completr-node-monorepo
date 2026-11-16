export const REWIND_DESIGNS = ["2025", "2026"] as const;

export type RewindDesign = (typeof REWIND_DESIGNS)[number];

export const DEFAULT_REWIND_DESIGN: RewindDesign = "2026";

export const REWIND_EDITION_MAX_REGENERATIONS = 1000;

export const REWIND_EDITIONS_WRITE_LOCK_KEY = 726_001;
