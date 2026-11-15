import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import { type RewindPremiumAccessKind } from "../rewind.constants";

export function isRewindYearAllowed(
	year: number,
	edition: Pick<RewindEditionRecord, "year">,
	accessKind: RewindPremiumAccessKind | null
): boolean {
	if (year === edition.year) return true;
	return year < edition.year && accessKind === "premium";
}
