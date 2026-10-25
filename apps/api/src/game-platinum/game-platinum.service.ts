import { type Transaction } from "sequelize";

import { Backlog } from "../backlog/backlog.model";
import * as backlogService from "../backlog/backlog.service";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import * as gamesService from "../games/games.service";
import * as platformsService from "../platforms/platforms.service";
import * as gamePlatinumServiceError from "./errors/game-platinum.service-error";
import { GamePlatinum } from "./game-platinum.model";
import { type UpsertGamePlatinumDto } from "./upsert-game-platinum.dto";

export interface UpsertedGamePlatinum {
	platinum: GamePlatinum;
	created: boolean;
}

async function resolveRunPlatformId(
	userId: string,
	gameId: string,
	backlogId: string
) {
	const run = await backlogService.findBacklogBasicById(backlogId);
	if (!run || run.userId !== userId)
		throw gamePlatinumServiceError.backlogNotFoundError();
	if (run.gameId !== gameId)
		throw gamePlatinumServiceError.backlogGameMismatchError();
	return run.platformId;
}

async function assertPlatformExists(platformId: string) {
	const platform = await platformsService.findPlatformById(platformId);
	if (!platform) throw gamePlatinumServiceError.platformNotFoundError();
}

async function buildPlatinumFields(
	userId: string,
	gameId: string,
	dto: UpsertGamePlatinumDto
) {
	const backlogId = dto.backlogId ?? null;
	const runPlatformId = backlogId
		? await resolveRunPlatformId(userId, gameId, backlogId)
		: null;
	const platformId = dto.platformId ?? runPlatformId;
	if (platformId && platformId !== runPlatformId)
		await assertPlatformExists(platformId);

	return {
		backlogId,
		platformId,
		platinumedAt: dto.platinumedAt ?? null,
		notes: dto.notes || null
	};
}

async function savePlatinum(
	userId: string,
	gameId: string,
	fields: Awaited<ReturnType<typeof buildPlatinumFields>>,
	transaction: Transaction
): Promise<UpsertedGamePlatinum> {
	try {
		const existing = await GamePlatinum.findOne({
			where: { userId, gameId },
			transaction,
			lock: transaction.LOCK.UPDATE
		});
		if (existing) {
			await existing.update(fields, { transaction });
			return { platinum: existing, created: false };
		}
		const platinum = await GamePlatinum.create(
			{ ...fields, userId, gameId },
			{ transaction }
		);
		return { platinum, created: true };
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gamePlatinumServiceError.uniqueConstraintError,
			validation: gamePlatinumServiceError.validationError
		});
	}
}

export async function upsertPlatinum(
	userId: string,
	gameId: string,
	dto: UpsertGamePlatinumDto
): Promise<UpsertedGamePlatinum> {
	const game = await gamesService.findGameById(gameId);
	if (!game) throw gamePlatinumServiceError.gameNotFoundError();

	const fields = await buildPlatinumFields(userId, gameId, dto);
	return sequelize.transaction(transaction =>
		savePlatinum(userId, gameId, fields, transaction)
	);
}

export async function removePlatinum(userId: string, gameId: string) {
	const deleted = await GamePlatinum.destroy({ where: { userId, gameId } });
	if (deleted === 0) throw gamePlatinumServiceError.notFoundError();
}

const PLATINUM_RUN_INCLUDE = {
	model: Backlog,
	attributes: ["id", "isPublic"],
	required: false
};

export async function findPlatinumByUserAndGame(
	userId: string,
	gameId: string
) {
	return GamePlatinum.findOne({
		where: { userId, gameId },
		include: [PLATINUM_RUN_INCLUDE]
	});
}

export async function findPlatinumsForGames(
	userId: string,
	gameIds: string[]
): Promise<Map<string, GamePlatinum>> {
	const uniqueGameIds = [...new Set(gameIds)];
	if (uniqueGameIds.length === 0) return new Map();

	const platinums = await GamePlatinum.findAll({
		where: { userId, gameId: uniqueGameIds },
		include: [PLATINUM_RUN_INCLUDE]
	});
	return new Map(platinums.map(platinum => [platinum.gameId, platinum]));
}
