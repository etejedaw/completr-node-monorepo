import { GameTime, TimeSource } from "./game-time.model";

export async function upsertGameTime(
	gameId: string,
	source: TimeSource,
	duration: number
) {
	const existing = await GameTime.findOne({
		where: { gameId, source }
	});

	if (existing) {
		await existing.update({ duration });
		return existing;
	}

	return GameTime.create({ gameId, source, duration });
}

export async function findTimesByGameId(gameId: string) {
	return GameTime.findAll({ where: { gameId } });
}
