import { type RewindEditionRecord } from "../rewind-editions.interface";

export function hasOrderedRewindEditionDates(
	dates: Pick<
		RewindEditionRecord,
		"opensAt" | "closesAt" | "graceStartsAt" | "graceEndsAt"
	>
): boolean {
	return (
		dates.opensAt <= dates.graceStartsAt &&
		dates.graceStartsAt <= dates.graceEndsAt &&
		dates.graceEndsAt <= dates.closesAt
	);
}
