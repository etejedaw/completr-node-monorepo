import { THEME_CATALOG } from "../constants/theme.constants";
import { type ThemeTier } from "../users.types";

export function getThemeTier(id: string): ThemeTier | null {
	return THEME_CATALOG.find(t => t.id === id)?.tier ?? null;
}

export function canUseTheme(themeId: string, role: string): boolean {
	const tier = getThemeTier(themeId);
	if (!tier) return false;
	if (tier === "free") return true;
	return role === "premium" || role === "moderator" || role === "admin";
}
