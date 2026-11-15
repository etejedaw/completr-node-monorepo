import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import { type RewindPremiumAccessKind } from "../rewind.constants";

export function resolveRegenerationQuota(
	edition: Pick<
		RewindEditionRecord,
		"premiumRegenerations" | "giftRegenerations"
	>,
	accessKind: RewindPremiumAccessKind
): number {
	return accessKind === "premium"
		? edition.premiumRegenerations
		: edition.giftRegenerations;
}
