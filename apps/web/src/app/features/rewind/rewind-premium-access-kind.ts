import {
	type RewindPremiumAccess,
	type RewindPremiumAccessKind
} from "../../core/models/rewind.model";

export function rewindPremiumAccessKindOf(
	access: RewindPremiumAccess | null
): RewindPremiumAccessKind | null {
	if (!access?.allowed) return null;
	return access.source === "feature-grant" ? "gift" : "premium";
}
