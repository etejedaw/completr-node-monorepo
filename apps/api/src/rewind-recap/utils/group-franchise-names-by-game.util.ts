import { type RewindGameFranchise } from "../../rewind/rewind-run.interface";

export function groupFranchiseNamesByGame(
	franchises: RewindGameFranchise[]
): Map<string, string[]> {
	const namesByGame = new Map<string, string[]>();
	for (const franchise of franchises) {
		const names = namesByGame.get(franchise.gameId) ?? [];
		if (!names.includes(franchise.name)) names.push(franchise.name);
		namesByGame.set(franchise.gameId, names);
	}
	return namesByGame;
}
