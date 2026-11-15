import { type RewindCalendar } from "../rewind-run.interface";
import { resolveOpenRewindEdition } from "./resolve-open-rewind-edition.util";

export function resolveSpotlightYear(
	calendar: Pick<RewindCalendar, "today" | "edition">
): number | null {
	return resolveOpenRewindEdition(calendar)?.year ?? null;
}
