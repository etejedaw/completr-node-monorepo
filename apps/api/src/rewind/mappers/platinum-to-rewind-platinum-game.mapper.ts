import { type GamePlatinum } from "../../game-platinum/game-platinum.model";
import { type RewindPlatinumRun } from "../rewind.interface";

export function platinumToRewindPlatinumGame(
	platinum: GamePlatinum
): RewindPlatinumRun | null {
	const { Game: game, platinumedAt } = platinum;
	if (!game || !platinumedAt) return null;
	return {
		gameId: game.id,
		code: game.code,
		title: game.title,
		coverUrl: game.coverUrl ?? null,
		backgroundUrl: game.backgroundUrl ?? null,
		platinumedAt,
		platformAbbreviation: platinum.Platform?.abbreviation ?? null,
		backlogId: platinum.backlogId ?? null
	};
}
