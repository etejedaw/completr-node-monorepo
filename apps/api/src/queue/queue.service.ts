import { type Transaction } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import * as backlogServiceError from "../backlog/errors/backlog.service-error";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type BulkResult } from "../common/interfaces/bulk-result.interface";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import { splitByPresence } from "../common/utils/split-by-presence.util";
import { toBulkSkipped } from "../common/utils/to-bulk-skipped.util";
import { sequelize } from "../database/sequelize.database";
import * as gamesService from "../games/games.service";
import * as platformsService from "../platforms/platforms.service";
import { resolvePremiumAccess } from "../premium-access/services/premium-access.service";
import * as queueServiceError from "./errors/queue.service-error";
import { FREE_QUEUE_LIMIT, QUEUE_ORDER } from "./queue.constants";
import { Queue } from "./queue.model";
import { type QueueExportQuery } from "./schemas/queue-export-query.schema";
import { moveInOrder } from "./utils/move-in-order.util";
import { sortQueueExport } from "./utils/sort-queue-export.util";

async function hasUnlimitedQueue(user: RequestUser) {
	const premiumAccess = await resolvePremiumAccess(user, "queue.unlimited");
	return premiumAccess.allowed;
}

async function checkLimit(
	user: RequestUser,
	unlimited: boolean,
	transaction: Transaction,
	incomingCount = 1
) {
	if (unlimited) return;
	const count = await Queue.count({
		where: { userId: user.id },
		transaction
	});
	if (count + incomingCount > FREE_QUEUE_LIMIT)
		throw queueServiceError.limitReachedError();
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

export async function addFromGame(
	gameId: string,
	platformId: string,
	user: RequestUser
) {
	const game = await gamesService.findGameById(gameId);
	if (!game) throw queueServiceError.gameNotFoundError();

	const platform = await platformsService.findPlatformById(platformId);
	if (!platform) throw queueServiceError.platformNotFoundError();

	const unlimited = await hasUnlimitedQueue(user);

	try {
		return await sequelize.transaction(async transaction => {
			await lockUserQueue(user.id, transaction);
			await checkLimit(user, unlimited, transaction);

			const backlogEntry = await backlogService.createNotStartedBacklog(
				user.id,
				gameId,
				platformId,
				transaction
			);
			await appendToQueue(user.id, backlogEntry.id, transaction);

			return Queue.findOne({
				where: { backlogId: backlogEntry.id, userId: user.id },
				include: backlogService.buildQueueBacklogInclude(),
				transaction
			});
		});
	} catch (error) {
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

async function addBacklogToQueue(
	backlogId: string,
	user: RequestUser,
	unlimited: boolean,
	transaction: Transaction
) {
	await lockUserQueue(user.id, transaction);
	await checkLimit(user, unlimited, transaction);

	const backlog = await backlogService.findBacklogBasicById(
		backlogId,
		transaction
	);
	if (!backlog || backlog.userId !== user.id)
		throw queueServiceError.backlogNotFoundError();
	if (backlog.status !== "not_started")
		throw queueServiceError.backlogNotStartedError([backlogId]);

	const existing = await Queue.findOne({
		where: { userId: user.id, backlogId },
		transaction
	});
	if (existing) throw queueServiceError.alreadyInQueueError();

	await appendToQueue(user.id, backlogId, transaction);
	return Queue.findOne({
		where: { backlogId, userId: user.id },
		include: backlogService.buildQueueBacklogInclude(),
		transaction
	});
}

export async function addFromBacklog(
	backlogId: string,
	user: RequestUser,
	transaction?: Transaction
) {
	const unlimited = await hasUnlimitedQueue(user);

	try {
		if (transaction)
			return await addBacklogToQueue(
				backlogId,
				user,
				unlimited,
				transaction
			);
		return await sequelize.transaction(queueTransaction =>
			addBacklogToQueue(backlogId, user, unlimited, queueTransaction)
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => queueServiceError.alreadyInQueueError()
		});
	}
}

async function validateReplacement(
	user: RequestUser,
	backlogIds: string[],
	transaction: Transaction
) {
	const premiumAccess = await resolvePremiumAccess(user, "queue.unlimited");
	if (!premiumAccess.allowed && backlogIds.length > FREE_QUEUE_LIMIT)
		throw queueServiceError.limitReachedError();

	const backlogs = await backlogService.findBacklogsByUserAndIds(
		user.id,
		backlogIds,
		transaction
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
}

export async function replaceQueue(user: RequestUser, backlogIds: string[]) {
	await sequelize.transaction(async transaction => {
		await lockUserQueue(user.id, transaction);
		if (backlogIds.length > 0)
			await validateReplacement(user, backlogIds, transaction);

		await Queue.destroy({ where: { userId: user.id }, transaction });
		await Queue.bulkCreate(
			backlogIds.map((backlogId, index) => ({
				userId: user.id,
				backlogId,
				position: index + 1
			})),
			{ transaction }
		);
	});

	if (backlogIds.length === 0) return [];
	return findQueueByUserId(user.id);
}

async function applyOrder(
	userId: string,
	orderedQueueIds: string[],
	transaction: Transaction
) {
	await sequelize.query(
		`UPDATE "Queues" AS q
		SET "position" = ordered."position", "updatedAt" = NOW()
		FROM (
			SELECT "id", "position"
			FROM unnest(ARRAY[:queueIds]::uuid[]) WITH ORDINALITY AS t("id", "position")
		) AS ordered
		WHERE q."id" = ordered."id" AND q."userId" = :userId AND q."position" <> ordered."position"`,
		{ replacements: { userId, queueIds: orderedQueueIds }, transaction }
	);
}

export async function moveQueueEntry(
	user: RequestUser,
	backlogId: string,
	position: number
) {
	await sequelize.transaction(async transaction => {
		await lockUserQueue(user.id, transaction);
		const entries = await Queue.findAll({
			where: { userId: user.id },
			attributes: ["id", "backlogId"],
			order: QUEUE_ORDER,
			transaction
		});
		const queueIdByBacklogId = new Map(
			entries.map(entry => [entry.backlogId, entry.id])
		);
		const reordered = moveInOrder(
			entries.map(entry => entry.backlogId),
			backlogId,
			position
		);
		if (!reordered) throw queueServiceError.backlogNotFoundError();
		await applyOrder(
			user.id,
			reordered.map(id => queueIdByBacklogId.get(id)!),
			transaction
		);
	});

	return findQueueByUserId(user.id);
}

export async function findQueueBacklogIdsByUserId(userId: string) {
	return Queue.findAll({
		where: { userId },
		attributes: ["backlogId"],
		order: QUEUE_ORDER
	});
}

export async function findQueueByUserId(userId: string) {
	return Queue.findAll({
		where: { userId },
		include: backlogService.buildQueueBacklogInclude(),
		order: QUEUE_ORDER
	});
}

export async function findQueueByUserIdPaginated(
	userId: string,
	pagination: PaginatedSearchQuery = {},
	publicOnly = false
) {
	const include = backlogService.buildQueueBacklogInclude(
		pagination.search,
		publicOnly
	);

	const query: Record<string, unknown> = {
		where: { userId },
		include,
		order: QUEUE_ORDER
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

export async function removeByBacklogIds(
	backlogIds: string[],
	userId: string,
	transaction: Transaction
) {
	await lockUserQueue(userId, transaction);
	const queued = await Queue.findAll({
		where: { backlogId: backlogIds, userId },
		attributes: ["backlogId"],
		transaction
	});
	if (queued.length === 0) return [];
	const removedBacklogIds = queued.map(entry => entry.backlogId);
	await Queue.destroy({
		where: { backlogId: removedBacklogIds, userId },
		transaction
	});
	await compactPositions(userId, transaction);
	return backlogIds.filter(id => removedBacklogIds.includes(id));
}

export async function removeByBacklogId(backlogId: string, userId: string) {
	const removed = await sequelize.transaction(transaction =>
		removeByBacklogIds([backlogId], userId, transaction)
	);
	return removed.length > 0;
}

export async function bulkAddToQueue(user: RequestUser, backlogIds: string[]) {
	const unlimited = await hasUnlimitedQueue(user);

	return sequelize.transaction(async transaction => {
		await lockUserQueue(user.id, transaction);
		const owned = await backlogService.findBacklogsByUserAndIds(
			user.id,
			backlogIds,
			transaction
		);
		const ownedById = new Map(owned.map(backlog => [backlog.id, backlog]));
		const { missing } = splitByPresence(backlogIds, ownedById.keys());
		const notStarted = backlogIds.filter(id => {
			const status = ownedById.get(id)?.status;
			return status !== undefined && status !== "not_started";
		});
		const eligible = backlogIds.filter(
			id => ownedById.get(id)?.status === "not_started"
		);

		const alreadyQueued = await Queue.findAll({
			where: { userId: user.id, backlogId: eligible },
			attributes: ["backlogId"],
			transaction
		});
		const { missing: toAdd } = splitByPresence(
			eligible,
			alreadyQueued.map(entry => entry.backlogId)
		);

		if (toAdd.length > 0) {
			await checkLimit(user, unlimited, transaction, toAdd.length);
			const firstPosition = await findNextPosition(user.id, transaction);
			await Queue.bulkCreate(
				toAdd.map((backlogId, index) => ({
					userId: user.id,
					backlogId,
					position: firstPosition + index
				})),
				{ transaction }
			);
		}

		return {
			succeeded: eligible,
			skipped: [
				...toBulkSkipped(
					missing,
					queueServiceError.backlogNotFoundError().code
				),
				...toBulkSkipped(
					notStarted,
					queueServiceError.backlogNotStartedError().code
				)
			],
			added: toAdd.map(id => ownedById.get(id)!)
		};
	});
}

export async function bulkRemoveFromQueue(
	userId: string,
	backlogIds: string[]
): Promise<BulkResult> {
	const removed = await sequelize.transaction(transaction =>
		removeByBacklogIds(backlogIds, userId, transaction)
	);
	const { missing } = splitByPresence(backlogIds, removed);
	return {
		succeeded: removed,
		skipped: toBulkSkipped(
			missing,
			queueServiceError.backlogNotFoundError().code
		)
	};
}

export async function findQueueForExport(
	userId: string,
	filters: QueueExportQuery
) {
	const entries = await Queue.findAll({
		where: { userId },
		include: backlogService.buildQueueExportBacklogInclude(filters.search),
		order: QUEUE_ORDER
	});
	return sortQueueExport(entries, filters.sort);
}
