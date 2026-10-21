import { Op, type Transaction } from "sequelize";

import { Backlog } from "../backlog/backlog.model";
import * as backlogService from "../backlog/backlog.service";
import * as backlogServiceError from "../backlog/errors/backlog.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import { Platform } from "../platforms/platform.model";
import * as platformsService from "../platforms/platforms.service";
import * as queueServiceError from "./errors/queue.service-error";
import { Queue } from "./queue.model";

const FREE_QUEUE_LIMIT = 10;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function checkLimit(
	userId: string,
	role: string,
	transaction?: Transaction
) {
	if (isPremium(role)) return;
	const count = await Queue.count({ where: { userId }, transaction });
	if (count >= FREE_QUEUE_LIMIT) throw queueServiceError.limitReachedError();
}

export async function lockUserQueue(userId: string, transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:lockKey))", {
		replacements: { lockKey: `queue:${userId}` },
		transaction
	});
}

async function findNextPosition(userId: string, transaction: Transaction) {
	await lockUserQueue(userId, transaction);
	const lastPosition = await Queue.max<number | null, Queue>("position", {
		where: { userId },
		transaction
	});
	return (lastPosition ?? 0) + 1;
}

const QUEUE_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const QUEUE_PLATFORM_ATTRS = ["id", "abbreviation"];

const BACKLOG_INCLUDE = [
	{
		model: Backlog,
		include: [
			{ model: Game, attributes: QUEUE_GAME_ATTRS },
			{ model: Platform, attributes: QUEUE_PLATFORM_ATTRS }
		]
	}
];

export async function addFromGame(
	gameId: string,
	platformId: string,
	user: RequestUser
) {
	await checkLimit(user.id, user.role);

	const game = await gamesService.findGameById(gameId);
	if (!game) throw queueServiceError.gameNotFoundError();

	const platform = await platformsService.findPlatformById(platformId);
	if (!platform) throw queueServiceError.platformNotFoundError();

	const transaction = await sequelize.transaction();

	try {
		const backlogEntry = await backlogService.createNotStartedBacklog(
			user.id,
			gameId,
			platformId,
			transaction
		);

		const position = await findNextPosition(user.id, transaction);

		await Queue.create(
			{
				userId: user.id,
				backlogId: backlogEntry.id,
				position
			},
			{ transaction }
		);

		await transaction.commit();

		return Queue.findOne({
			where: { backlogId: backlogEntry.id, userId: user.id },
			include: BACKLOG_INCLUDE
		});
	} catch (error) {
		await transaction.rollback();
		rethrowSequelizeError(error, {
			unique: () => queueServiceError.alreadyInQueueError(),
			validation: backlogServiceError.validationError
		});
	}
}

async function appendToQueue(
	userId: string,
	backlogId: string,
	transaction: Transaction
) {
	const position = await findNextPosition(userId, transaction);
	await Queue.create({ userId, backlogId, position }, { transaction });
}

export async function addFromBacklog(
	backlogId: string,
	user: RequestUser,
	transaction?: Transaction
) {
	await checkLimit(user.id, user.role, transaction);

	const backlog = await backlogService.findBacklogBasicById(
		backlogId,
		transaction
	);
	if (!backlog) throw queueServiceError.backlogNotFoundError();
	if (backlog.userId !== user.id)
		throw queueServiceError.backlogNotOwnedError();
	if (backlog.status !== "not_started")
		throw queueServiceError.backlogNotStartedError([backlogId]);

	const existing = await Queue.findOne({
		where: { userId: user.id, backlogId },
		transaction
	});
	if (existing) throw queueServiceError.alreadyInQueueError();

	try {
		if (transaction) await appendToQueue(user.id, backlogId, transaction);
		else
			await sequelize.transaction(queueTransaction =>
				appendToQueue(user.id, backlogId, queueTransaction)
			);
		return Queue.findOne({
			where: { backlogId, userId: user.id },
			include: BACKLOG_INCLUDE,
			transaction
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => queueServiceError.alreadyInQueueError()
		});
	}
}

export async function replaceQueue(user: RequestUser, backlogIds: string[]) {
	if (backlogIds.length === 0) {
		await Queue.destroy({ where: { userId: user.id } });
		return [];
	}

	if (!isPremium(user.role) && backlogIds.length > FREE_QUEUE_LIMIT)
		throw queueServiceError.limitReachedError();

	const backlogs = await backlogService.findBacklogsByUserAndIds(
		user.id,
		backlogIds
	);
	if (backlogs.length !== backlogIds.length) {
		const foundIds = new Set(backlogs.map(b => b.id));
		const missing = backlogIds.filter(id => !foundIds.has(id));
		throw queueServiceError.backlogsNotFoundError(missing);
	}
	const invalid = backlogs
		.filter(b => b.status !== "not_started")
		.map(b => b.id);
	if (invalid.length > 0)
		throw queueServiceError.backlogNotStartedError(invalid);

	const entries = backlogIds.map((backlogId, index) => ({
		userId: user.id,
		backlogId,
		position: index + 1
	}));
	await sequelize.transaction(async transaction => {
		await lockUserQueue(user.id, transaction);
		await Queue.destroy({ where: { userId: user.id }, transaction });
		await Queue.bulkCreate(entries, { transaction });
	});

	return Queue.findAll({
		where: { userId: user.id },
		include: BACKLOG_INCLUDE,
		order: [["position", "ASC"]]
	});
}

export async function findQueueBacklogIdsByUserId(userId: string) {
	return Queue.findAll({
		where: { userId },
		attributes: ["backlogId"],
		order: [["position", "ASC"]]
	});
}

export async function findQueueByUserId(userId: string) {
	return Queue.findAll({
		where: { userId },
		include: BACKLOG_INCLUDE,
		order: [["position", "ASC"]]
	});
}

export async function findQueueByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {},
	publicOnly = false
) {
	const include = pagination.search
		? [
				{
					model: Backlog,
					required: true,
					where: publicOnly ? { isPublic: true } : undefined,
					include: [
						{
							model: Game,
							required: true,
							attributes: QUEUE_GAME_ATTRS,
							where: {
								title: { [Op.iLike]: `%${pagination.search}%` }
							}
						},
						{ model: Platform, attributes: QUEUE_PLATFORM_ATTRS }
					]
				}
			]
		: publicOnly
			? [
					{
						...BACKLOG_INCLUDE[0]!,
						required: true,
						where: { isPublic: true }
					}
				]
			: BACKLOG_INCLUDE;

	const query: Record<string, unknown> = {
		where: { userId },
		include,
		order: [["position", "ASC"]]
	};
	if (pagination.limit) query.limit = pagination.limit;
	if (pagination.offset) query.offset = pagination.offset;

	const { rows, count } = await Queue.findAndCountAll(query);
	return { rows, total: count };
}

export async function compactPositions(
	userId: string,
	transaction: Transaction
) {
	await lockUserQueue(userId, transaction);
	await sequelize.query(
		`UPDATE "Queues" AS q
		SET "position" = ranked."position", "updatedAt" = NOW()
		FROM (
			SELECT "id", ROW_NUMBER() OVER (ORDER BY "position", "createdAt", "id") AS "position"
			FROM "Queues"
			WHERE "userId" = :userId
		) AS ranked
		WHERE q."id" = ranked."id" AND q."position" <> ranked."position"`,
		{ replacements: { userId }, transaction }
	);
}

export async function removeByBacklogId(backlogId: string, userId: string) {
	return sequelize.transaction(async transaction => {
		await lockUserQueue(userId, transaction);
		const removedCount = await Queue.destroy({
			where: { backlogId, userId },
			transaction
		});
		if (removedCount === 0) return false;
		await compactPositions(userId, transaction);
		return true;
	});
}
