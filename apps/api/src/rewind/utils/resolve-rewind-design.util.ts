import { DEFAULT_REWIND_DESIGN } from "../../rewind-editions/rewind-editions.constants";
import { type RewindCalendar } from "../rewind-run.interface";

export function resolveRewindDesign(
	calendar: Pick<RewindCalendar, "edition">
): string {
	return calendar.edition?.design ?? DEFAULT_REWIND_DESIGN;
}
