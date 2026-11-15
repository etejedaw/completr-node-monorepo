import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapFranchiseGroup } from "../rewind-recap.interface";
import { compareByFinishedAt } from "./compare-by-finished-at.util";
import { toDateOnly } from "./to-date-only.util";

export function toFranchiseGroup(
	name: string,
	runs: RewindRun[]
): RecapFranchiseGroup {
	return {
		name,
		games: [...runs].sort(compareByFinishedAt).map(run => ({
			title: run.game.title,
			status: run.status,
			finishedAt: toDateOnly(run.finishedAt) ?? ""
		}))
	};
}
