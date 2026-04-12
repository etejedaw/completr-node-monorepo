import { GameExternal, ExternalSource } from "./game-external.model";

export async function findByExternalId(
	source: ExternalSource,
	externalId: string
) {
	return GameExternal.findOne({
		where: { source, externalId }
	});
}

export async function create(
	gameId: string,
	source: ExternalSource,
	externalId: string
) {
	return GameExternal.create({ gameId, source, externalId });
}

export async function findByGameId(gameId: string) {
	return GameExternal.findAll({ where: { gameId } });
}

export async function upsert(
	gameId: string,
	source: ExternalSource,
	externalId: string
) {
	const existing = await GameExternal.findOne({
		where: { gameId, source }
	});

	if (existing) {
		await existing.update({ externalId });
		return existing;
	}

	return GameExternal.create({ gameId, source, externalId });
}
