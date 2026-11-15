import { toUtcDay } from "../../common/utils/to-utc-day.util";
import { type RewindPeriodStatus } from "../../rewind/rewind.constants";
import { type RewindEditionRecord } from "../rewind-editions.interface";
import { isRewindEditionOpenOn } from "./is-rewind-edition-open-on.util";

export function resolveRewindEditionStatus(
	edition: Pick<RewindEditionRecord, "opensAt" | "closesAt">,
	today: Date
): RewindPeriodStatus {
	if (isRewindEditionOpenOn(edition, today)) return "open";
	return toUtcDay(today) < edition.opensAt ? "scheduled" : "closed";
}
