import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { type RecapSameDayClose } from "../rewind-recap.interface";
import { groupBy } from "./group-by.util";
import { toClosedGame } from "./to-closed-game.util";
import { toDateOnly } from "./to-date-only.util";

export function findSameDayCloses(runs: RewindRun[]): RecapSameDayClose[] {
	const byDate = groupBy(runs, run => [toDateOnly(run.finishedAt) ?? ""]);
	return [...byDate.entries()]
		.filter(([date, closed]) => date !== "" && closed.length >= 2)
		.map(([date, closed]) => ({ date, games: closed.map(toClosedGame) }))
		.sort((first, second) => compareText(first.date, second.date));
}
