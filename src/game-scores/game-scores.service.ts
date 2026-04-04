import { GameScore, ScoreSource } from "./game-score.model";

export async function upsertGameScore(
	gameId: string,
	source: ScoreSource,
	score: number | null,
	duration: number | null,
	count = 1
) {
	const existing = await GameScore.findOne({
		where: { gameId, source }
	});

	if (existing) {
		await existing.update({ score, duration, count });
		return existing;
	}

	return GameScore.create({ gameId, source, score, duration, count });
}

export async function findScoresByGameId(gameId: string) {
	return GameScore.findAll({ where: { gameId } });
}
