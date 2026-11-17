import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RewindRunPlatinum } from "../rewind-recap.interface";
import { daysBetween } from "./days-between.util";
import { toDateOnly } from "./to-date-only.util";

export function daysToPlatinum(
	run: RewindRun,
	platinum: RewindRunPlatinum | undefined
): number | null {
	const finishedAt = toDateOnly(run.finishedAt);
	const platinumedAt = toDateOnly(platinum?.platinumedAt ?? null);
	if (finishedAt === null || platinumedAt === null) return null;
	return daysBetween(finishedAt, platinumedAt);
}
