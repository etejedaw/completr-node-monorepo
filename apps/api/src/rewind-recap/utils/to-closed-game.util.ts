import { type RewindRun } from "../../rewind/rewind-run.interface";
import { type RecapClosedGame } from "../rewind-recap.interface";

export function toClosedGame(run: RewindRun): RecapClosedGame {
	return {
		title: run.game.title,
		status: run.status,
		userRating: run.userRating
	};
}
