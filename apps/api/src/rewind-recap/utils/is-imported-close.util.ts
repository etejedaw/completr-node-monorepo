import { type RewindRun } from "../../rewind/rewind-run.interface";
import { toDateOnly } from "./to-date-only.util";

export function isImportedClose(run: RewindRun, year: number): boolean {
	return (
		run.startedAt === null && toDateOnly(run.finishedAt) === `${year}-01-01`
	);
}
