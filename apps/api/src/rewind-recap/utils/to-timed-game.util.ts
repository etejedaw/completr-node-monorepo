import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapTimedGame } from "../rewind-recap.interface";
import { daysToFinish } from "./days-to-finish.util";
import { toDateOnly } from "./to-date-only.util";

export function toTimedGame(run: RewindRun): RecapTimedGame | null {
	const days = daysToFinish(run);
	const startedAt = toDateOnly(run.startedAt);
	const finishedAt = toDateOnly(run.finishedAt);
	if (days === null || startedAt === null || finishedAt === null) return null;
	return {
		title: run.game.title,
		status: run.status,
		startedAt,
		finishedAt,
		days
	};
}
