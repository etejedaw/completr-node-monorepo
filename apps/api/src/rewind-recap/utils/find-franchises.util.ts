import {
	type RewindGameFranchise,
	type RewindRun
} from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { MIN_GROUP_GAMES } from "../rewind-recap.constants";
import { type RecapFranchiseGroup } from "../rewind-recap.interface";
import { groupBy } from "./group-by.util";
import { groupFranchiseNamesByGame } from "./group-franchise-names-by-game.util";
import { toFranchiseGroup } from "./to-franchise-group.util";

export function findFranchises(
	runs: RewindRun[],
	franchises: RewindGameFranchise[]
): RecapFranchiseGroup[] {
	const namesByGame = groupFranchiseNamesByGame(franchises);
	const groups = groupBy(runs, run => namesByGame.get(run.gameId) ?? []);
	return [...groups.entries()]
		.filter(
			([, grouped]) =>
				new Set(grouped.map(run => run.gameId)).size >= MIN_GROUP_GAMES
		)
		.map(([name, grouped]) => toFranchiseGroup(name, grouped))
		.sort(
			(first, second) =>
				second.games.length - first.games.length ||
				compareText(first.name, second.name)
		);
}
