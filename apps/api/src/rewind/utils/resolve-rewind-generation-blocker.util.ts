import {
	type RewindGenerationBlocker,
	type RewindPremiumAccessKind
} from "../rewind.constants";
import { type RewindCalendar } from "../rewind-run.interface";
import { isRewindYearAllowed } from "./is-rewind-year-allowed.util";
import { resolveOpenRewindEdition } from "./resolve-open-rewind-edition.util";

export function resolveRewindGenerationBlocker(
	year: number,
	calendar: Pick<RewindCalendar, "today" | "edition">,
	accessKind: RewindPremiumAccessKind | null
): RewindGenerationBlocker | null {
	const edition = resolveOpenRewindEdition(calendar);
	if (!edition) return "period-closed";
	return isRewindYearAllowed(year, edition, accessKind)
		? null
		: "requires-premium";
}
