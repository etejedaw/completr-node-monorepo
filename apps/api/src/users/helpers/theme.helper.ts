import { type PremiumAccessUser } from "../../premium-access/premium-access.interface";
import { resolvePremiumAccess } from "../../premium-access/premium-access.service";
import { THEME_CATALOG } from "../constants/theme.constants";
import { type ThemeTier } from "../users.types";

export function getThemeTier(id: string): ThemeTier | null {
	return THEME_CATALOG.find(t => t.id === id)?.tier ?? null;
}

export async function canUseTheme(themeId: string, user: PremiumAccessUser) {
	const tier = getThemeTier(themeId);
	if (!tier) return false;
	if (tier === "free") return true;
	const premiumAccess = await resolvePremiumAccess(user, "themes.premium");
	return premiumAccess.allowed;
}
