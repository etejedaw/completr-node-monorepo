import { isUtcDayBetween } from "../../common/utils/is-utc-day-between.util";
import { type RewindEditionRecord } from "../rewind-editions.interface";

export function isRewindEditionOpenOn(
	edition: Pick<RewindEditionRecord, "opensAt" | "closesAt">,
	today: Date
): boolean {
	return isUtcDayBetween(today, edition.opensAt, edition.closesAt);
}
