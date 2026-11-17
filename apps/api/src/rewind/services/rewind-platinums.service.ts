import * as gamePlatinumService from "../../game-platinum/game-platinum.service";
import { platinumToRewindPlatinumGame } from "../mappers/platinum-to-rewind-platinum-game.mapper";
import { type RewindPlatinumGame } from "../rewind.interface";

export async function findRewindPlatinumGames(
	ownerId: string,
	year: number
): Promise<RewindPlatinumGame[]> {
	const platinums = await gamePlatinumService.findPlatinumsByUserIdAndYear(
		ownerId,
		year
	);
	return platinums.flatMap(platinum => {
		const game = platinumToRewindPlatinumGame(platinum);
		return game ? [game] : [];
	});
}
