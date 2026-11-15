import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapTimedGame } from "../rewind-recap.interface";
import { toTimedGame } from "./to-timed-game.util";

export function timedGames(runs: RewindRun[]): RecapTimedGame[] {
	return runs.flatMap(run => {
		const timed = toTimedGame(run);
		return timed === null ? [] : [timed];
	});
}
