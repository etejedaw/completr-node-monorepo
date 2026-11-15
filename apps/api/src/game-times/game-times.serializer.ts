import { type GameTime } from "./game-time.model";

export function gameTimeSerializer(gameTime: GameTime) {
	return {
		id: gameTime.id,
		gameId: gameTime.gameId,
		source: gameTime.source,
		duration: gameTime.duration,
		updatedAt: gameTime.updatedAt
	};
}
