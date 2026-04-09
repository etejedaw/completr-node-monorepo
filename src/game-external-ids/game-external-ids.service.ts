import { GameExternalId, ExternalSource } from "./game-external-id.model";

export async function findByExternalId(
	source: ExternalSource,
	externalId: string
) {
	return GameExternalId.findOne({
		where: { source, externalId }
	});
}

export async function createExternalId(
	gameId: string,
	source: ExternalSource,
	externalId: string
) {
	return GameExternalId.create({ gameId, source, externalId });
}

export async function findByGameId(gameId: string) {
	return GameExternalId.findAll({ where: { gameId } });
}
