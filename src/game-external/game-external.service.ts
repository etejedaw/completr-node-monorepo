import { GameExternal, ExternalSource } from "./game-external.model";
import * as gameExternalServiceError from "./errors/game-external.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";

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
	try {
		return await GameExternal.create({ gameId, source, externalId });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameExternalServiceError.uniqueConstraintError
		});
	}
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

	try {
		return await GameExternal.create({ gameId, source, externalId });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameExternalServiceError.uniqueConstraintError
		});
	}
}
