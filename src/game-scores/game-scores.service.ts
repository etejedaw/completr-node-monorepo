import { GameScore, ScoreSource } from "./game-score.model";

export async function upsertGameScore(
	gameId: string,
	source: ScoreSource,
	score: number
) {
	const existing = await GameScore.findOne({
		where: { gameId, source }
	});

	if (existing) {
		await existing.update({ score });
		return existing;
	}

	return GameScore.create({ gameId, source, score });
}

export async function findScoresByGameId(gameId: string) {
	return GameScore.findAll({ where: { gameId } });
}
