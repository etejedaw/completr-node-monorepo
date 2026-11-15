import { type RewindRun } from "../../rewind/rewind-run.interface";
import { toDateOnly } from "./to-date-only.util";

export function isClosedInYear(run: RewindRun, year: number): boolean {
	return (
		(run.status === "completed" || run.status === "abandoned") &&
		toDateOnly(run.finishedAt)?.slice(0, 4) === String(year)
	);
}
