import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import { isRewindEditionOpenOn } from "../../rewind-editions/utils/is-rewind-edition-open-on.util";
import { type RewindCalendar } from "../rewind-run.interface";

export function resolveOpenRewindEdition(
	calendar: Pick<RewindCalendar, "today" | "edition">
): RewindEditionRecord | null {
	const { edition, today } = calendar;
	if (!edition) return null;
	return isRewindEditionOpenOn(edition, today) ? edition : null;
}
