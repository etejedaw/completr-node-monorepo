import { type RewindStoredPlatinumGame } from "../rewind.interface";

export function collectPlatinumRunIds(
	platinumGames: RewindStoredPlatinumGame[] | null | undefined
): Set<string> {
	return new Set(
		(platinumGames ?? []).flatMap(platinum =>
			platinum.backlogId ? [platinum.backlogId] : []
		)
	);
}
