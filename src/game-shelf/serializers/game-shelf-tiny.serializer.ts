import { GameShelf } from "../game-shelf.model";

export function gameShelfSerializerTiny(gameShelf: GameShelf) {
	const ratio =
		gameShelf.score && gameShelf.duration
			? gameShelf.score / gameShelf.duration
			: null;

	return {
		id: gameShelf.id,
		userId: gameShelf.userId,
		platformId: gameShelf.platformId,
		isPublic: gameShelf.isPublic,
		acquiredAt: gameShelf.acquiredAt,
		edition: gameShelf.edition,
		notes: gameShelf.notes,
		score: gameShelf.score,
		duration: gameShelf.duration,
		scoreSource: gameShelf.scoreSource,
		durationSource: gameShelf.durationSource,
		ratio
	};
}
