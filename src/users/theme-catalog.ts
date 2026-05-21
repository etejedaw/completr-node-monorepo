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

export function getThemeTier(id: string): ThemeTier | null {
	return THEME_CATALOG.find(t => t.id === id)?.tier ?? null;
}

export function canUseTheme(themeId: string, role: string): boolean {
	const tier = getThemeTier(themeId);
	if (!tier) return false;
	if (tier === "free") return true;
	return role === "premium" || role === "moderator" || role === "admin";
}
