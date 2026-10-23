import { type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import * as gameExternalServiceError from "./errors/game-external.service-error";
import { type ExternalSource, GameExternal } from "./game-external.model";

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

export async function findGameIdsBySource(
	source: ExternalSource
): Promise<string[]> {
	const rows = await GameExternal.findAll({
		where: { source },
		attributes: ["gameId"]
	});
	return rows.map(r => r.gameId);
}

export async function upsert(
	gameId: string,
	source: ExternalSource,
	externalId: string,
	transaction?: Transaction
) {
	const existing = await GameExternal.findOne({
		where: { gameId, source },
		transaction
	});

	if (existing) {
		await existing.update({ externalId }, { transaction });
		return existing;
	}

	try {
		return await GameExternal.create(
			{ gameId, source, externalId },
			{ transaction }
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameExternalServiceError.uniqueConstraintError
		});
	}
}

export async function upsertMany(
	gameId: string,
	entries: { source: ExternalSource; externalId: string }[],
	transaction?: Transaction
) {
	if (entries.length === 0) return [];
	const externalIdBySource = new Map(
		entries.map(entry => [entry.source, entry.externalId])
	);
	const existing = await GameExternal.findAll({
		where: { gameId, source: [...externalIdBySource.keys()] },
		transaction
	});
	const existingSources = new Set(existing.map(row => row.source));

	try {
		const created = await GameExternal.bulkCreate(
			[...externalIdBySource]
				.filter(([source]) => !existingSources.has(source))
				.map(([source, externalId]) => ({
					gameId,
					source,
					externalId
				})),
			{ validate: true, transaction }
		);
		const changed = existing.filter(
			row => externalIdBySource.get(row.source) !== row.externalId
		);
		const updated = await GameExternal.bulkCreate(
			changed.map(row => ({
				id: row.id,
				gameId,
				source: row.source,
				externalId: externalIdBySource.get(row.source)!
			})),
			{
				validate: true,
				updateOnDuplicate: ["externalId", "updatedAt"],
				transaction
			}
		);
		return [
			...existing.filter(row => !changed.includes(row)),
			...updated,
			...created
		];
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gameExternalServiceError.uniqueConstraintError
		});
	}
}
