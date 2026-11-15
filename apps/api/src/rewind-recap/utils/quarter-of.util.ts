import { type RewindRun } from "../../rewind/rewind-run.interface";
import { QUARTER_NAMES } from "../rewind-recap.constants";
import { toDateOnly } from "./to-date-only.util";

export function quarterOf(run: RewindRun): string[] {
	const month = Number(toDateOnly(run.finishedAt)?.slice(5, 7));
	const name = QUARTER_NAMES[Math.floor((month - 1) / 3)];
	return name ? [name] : [];
}
