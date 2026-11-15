import { type GameScore } from "./game-score.model";

export function gameScoreSerializer(gameScore: GameScore) {
	return {
		id: gameScore.id,
		gameId: gameScore.gameId,
		source: gameScore.source,
		score: gameScore.score,
		updatedAt: gameScore.updatedAt
	};
}
