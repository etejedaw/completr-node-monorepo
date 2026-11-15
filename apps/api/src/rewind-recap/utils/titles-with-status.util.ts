import { type RewindRun } from "../../rewind/rewind-run.interface";

export function titlesWithStatus(runs: RewindRun[], status: string): string[] {
	return runs.filter(run => run.status === status).map(run => run.game.title);
}
