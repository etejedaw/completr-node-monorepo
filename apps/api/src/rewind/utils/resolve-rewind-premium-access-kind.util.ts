import { type PremiumAccess } from "../../premium-access/premium-access.interface";
import { type RewindPremiumAccessKind } from "../rewind.constants";

export function resolveRewindPremiumAccessKind(
	premiumAccess: PremiumAccess
): RewindPremiumAccessKind | null {
	if (!premiumAccess.allowed) return null;
	return premiumAccess.source === "feature-grant" ? "gift" : "premium";
}
