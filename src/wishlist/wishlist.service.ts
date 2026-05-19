import { Op } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Wishlist } from "./wishlist.model";
import { Backlog } from "../backlog/backlog.model";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { PaginatedSearchQuery } from "../common/schemas/paginated-search-query.schema";
import * as wishlistServiceError from "./errors/wishlist.service-error";

const FREE_WISHLIST_LIMIT = 10;

function isPremium(role: string) {
	return role === "premium" || role === "moderator" || role === "admin";
}

async function checkLimit(userId: string, role: string) {
	if (isPremium(role)) return;
	const count = await Wishlist.count({ where: { userId } });
	if (count >= FREE_WISHLIST_LIMIT)
		throw wishlistServiceError.limitReachedError();
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
	if (!game) throw wishlistServiceError.gameNotFoundError();

	const platform = await Platform.findOne({ where: { id: platformId } });
	if (!platform) throw wishlistServiceError.platformNotFoundError();

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
			(await Wishlist.count({ where: { userId: user.id } })) + 1;

		await Wishlist.create(
			{
				userId: user.id,
				backlogId: backlogEntry.id,
				position
			},
			{ transaction }
		);

		await transaction.commit();

		return Wishlist.findOne({
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
	if (!backlog) throw wishlistServiceError.backlogNotFoundError();
	if (backlog.userId !== user.id)
		throw wishlistServiceError.backlogNotOwnedError();

	const existing = await Wishlist.findOne({
		where: { userId: user.id, backlogId }
	});
	if (existing) throw wishlistServiceError.alreadyInWishlistError();

	const position = (await Wishlist.count({ where: { userId: user.id } })) + 1;

	await Wishlist.create({
		userId: user.id,
		backlogId,
		position
	});

	return Wishlist.findOne({
		where: { backlogId, userId: user.id },
		include: BACKLOG_INCLUDE
	});
}

export async function replaceWishlist(user: RequestUser, backlogIds: string[]) {
	if (backlogIds.length === 0) {
		await Wishlist.destroy({ where: { userId: user.id } });
		return [];
	}

	if (!isPremium(user.role) && backlogIds.length > FREE_WISHLIST_LIMIT)
		throw wishlistServiceError.limitReachedError();

	const backlogs = await Backlog.findAll({
		where: { id: backlogIds, userId: user.id }
	});
	if (backlogs.length !== backlogIds.length) {
		const foundIds = new Set(backlogs.map(b => b.id));
		const missing = backlogIds.filter(id => !foundIds.has(id));
		throw wishlistServiceError.backlogsNotFoundError(missing);
	}

	await Wishlist.destroy({ where: { userId: user.id } });

	const entries = backlogIds.map((backlogId, index) => ({
		userId: user.id,
		backlogId,
		position: index + 1
	}));
	await Wishlist.bulkCreate(entries);

	return Wishlist.findAll({
		where: { userId: user.id },
		include: BACKLOG_INCLUDE,
		order: [["position", "ASC"]]
	});
}

export async function findWishlistByUserId(userId: string) {
	return Wishlist.findAll({
		where: { userId },
		include: BACKLOG_INCLUDE,
		order: [["position", "ASC"]]
	});
}

export async function findWishlistByUserIdPaginated(
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

	const { rows, count } = await Wishlist.findAndCountAll(query);
	return { rows, total: count };
}

export async function removeByBacklogId(backlogId: string) {
	await Wishlist.destroy({ where: { backlogId } });
}
