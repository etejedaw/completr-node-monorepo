import { type GameShelf } from "../game-shelf.model";

export function gameShelfSerializerTiny(gameShelf: GameShelf) {
	return {
		id: gameShelf.id,
		userId: gameShelf.userId,
		platformId: gameShelf.platformId,
		isPublic: gameShelf.isPublic,
		acquiredAt: gameShelf.acquiredAt,
		edition: gameShelf.edition,
		notes: gameShelf.notes
	};
}
