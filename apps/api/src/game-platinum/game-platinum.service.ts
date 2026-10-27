import { literal, type Order, type Transaction } from "sequelize";

import { Backlog } from "../backlog/backlog.model";
import * as backlogService from "../backlog/backlog.service";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type ExportPlatformSearchQuery } from "../common/schemas/export-platform-search-query.schema";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { buildPlatformFilterWhere } from "../common/utils/platform-filter-where.util";
import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import { Platform } from "../platforms/platform.model";
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

const LATEST_PLATINUMS_FIRST: Order = [
	literal('"GamePlatinum"."platinumedAt" DESC NULLS LAST'),
	["createdAt", "DESC"],
	["id", "ASC"]
];

export async function findPlatinumsByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {}
) {
	const gameInclude: Record<string, unknown> = {
		model: Game,
		attributes: ["id", "code", "title", "backgroundUrl", "isDlc"]
	};
	const titleWhere = pagination.search
		? buildTextSearchWhere(pagination.search, ["Game.title"])
		: null;
	if (titleWhere) {
		gameInclude.where = titleWhere;
		gameInclude.required = true;
	}

	const query: Record<string, unknown> = {
		where: { userId },
		include: [
			gameInclude,
			{
				model: Platform,
				attributes: ["id", "name", "abbreviation"],
				required: false
			},
			PLATINUM_RUN_INCLUDE
		],
		order: LATEST_PLATINUMS_FIRST
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await GamePlatinum.findAndCountAll(query);
	return { rows, total: count };
}

export async function findPlatinumsForExport(
	userId: string,
	filters: ExportPlatformSearchQuery = {}
) {
	const titleWhere = filters.search
		? buildTextSearchWhere(filters.search, ["Game.title"])
		: null;

	return GamePlatinum.findAll({
		where: { userId, ...buildPlatformFilterWhere(filters.platform) },
		include: [
			{
				model: Game,
				attributes: ["id", "title"],
				...(titleWhere && { required: true, where: titleWhere })
			},
			{
				model: Platform,
				attributes: ["id", "name"],
				required: false
			}
		],
		order: LATEST_PLATINUMS_FIRST
	});
}
