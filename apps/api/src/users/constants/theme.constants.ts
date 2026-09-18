export type ThemeTier = "free" | "premium";

export interface ThemeEntry {
	id: string;
	tier: ThemeTier;
}

export const THEME_CATALOG: ThemeEntry[] = [
	{ id: "refined-dark", tier: "free" },
	{ id: "midnight-cyan", tier: "free" },
	{ id: "twilight-arcade", tier: "free" }
];

export const THEME_IDS = THEME_CATALOG.map(t => t.id);

export const DEFAULT_THEME = "refined-dark";
