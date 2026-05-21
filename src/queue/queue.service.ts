import { Op } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Queue } from "./queue.model";
import { Backlog } from "../backlog/backlog.model";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as queueServiceError from "./errors/queue.service-error";

const FREE_QUEUE_LIMIT = 10;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function checkLimit(userId: string, role: string) {
	if (isPremium(role)) return;
	const count = await Queue.count({ where: { userId } });
	if (count >= FREE_QUEUE_LIMIT) throw queueServiceError.limitReachedError();
}

const BACKLOG_INCLUDE = [
	{ model: Backlog, include: [{ model: Game }, { model: Platform }] }
];

export async function addFromGame(
	gameId: string,
	platformId: string,
	user: RequestUser
) {
	await checkLimit(user.id, user.role);

	const game = await Game.findOne({ where: { id: gameId } });
	if (!game) throw queueServiceError.gameNotFoundError();

	const platform = await Platform.findOne({ where: { id: platformId } });
	if (!platform) throw queueServiceError.platformNotFoundError();

	const transaction = await sequelize.transaction();

	try {
		const backlogEntry = await Backlog.create(
			{
				userId: user.id,
				gameId,
				platformId,
				status: "not_started"
			},
			{ transaction }
		);

		const position =
			(await Queue.count({ where: { userId: user.id } })) + 1;

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
		throw error;
	}
}

export async function addFromBacklog(backlogId: string, user: RequestUser) {
	await checkLimit(user.id, user.role);

	const backlog = await Backlog.findOne({ where: { id: backlogId } });
	if (!backlog) throw queueServiceError.backlogNotFoundError();
	if (backlog.userId !== user.id)
		throw queueServiceError.backlogNotOwnedError();

	const existing = await Queue.findOne({
		where: { userId: user.id, backlogId }
	});
	if (existing) throw queueServiceError.alreadyInQueueError();

	const position = (await Queue.count({ where: { userId: user.id } })) + 1;

	await Queue.create({
		userId: user.id,
		backlogId,
		position
	});

	return Queue.findOne({
		where: { backlogId, userId: user.id },
		include: BACKLOG_INCLUDE
	});
}

export async function replaceQueue(user: RequestUser, backlogIds: string[]) {
	if (backlogIds.length === 0) {
		await Queue.destroy({ where: { userId: user.id } });
		return [];
	}

	if (!isPremium(user.role) && backlogIds.length > FREE_QUEUE_LIMIT)
		throw queueServiceError.limitReachedError();

	const backlogs = await Backlog.findAll({
		where: { id: backlogIds, userId: user.id }
	});
	if (backlogs.length !== backlogIds.length) {
		const foundIds = new Set(backlogs.map(b => b.id));
		const missing = backlogIds.filter(id => !foundIds.has(id));
		throw queueServiceError.backlogsNotFoundError(missing);
	}

	await Queue.destroy({ where: { userId: user.id } });

	const entries = backlogIds.map((backlogId, index) => ({
		userId: user.id,
		backlogId,
		position: index + 1
	}));
	await Queue.bulkCreate(entries);

	return Queue.findAll({
		where: { userId: user.id },
		include: BACKLOG_INCLUDE,
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
	pagination: PaginatedSearchQuery = {}
) {
	const include = pagination.search
		? [
				{
					model: Backlog,
					required: true,
					include: [
						{
							model: Game,
							required: true,
							where: {
								title: { [Op.iLike]: `%${pagination.search}%` }
							}
						},
						{ model: Platform }
					]
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

export async function removeByBacklogId(backlogId: string) {
	await Queue.destroy({ where: { backlogId } });
}
