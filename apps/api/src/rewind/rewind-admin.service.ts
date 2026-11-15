import { Op } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import * as usersService from "../users/users.service";
import * as rewindServiceError from "./errors/rewind.service-error";
import { DEFAULT_ADMIN_REWINDS_PAGE_SIZE } from "./rewind.constants";
import { Rewind } from "./rewind.model";
import { type AdminRewindItem } from "./rewind-admin.interface";
import { type AdminRewindsQuery } from "./schemas/admin-rewinds-query.schema";

async function findUsernamesById(
	userIds: string[]
): Promise<Map<string, { id: string; username: string }>> {
	const users = await usersService.findUsersByIds(userIds);
	return new Map(
		users.map(user => [user.id, { id: user.id, username: user.username }])
	);
}

function toItem(
	rewind: Rewind,
	user: { id: string; username: string }
): AdminRewindItem {
	return {
		id: rewind.id,
		year: rewind.year,
		user,
		premiumAccessKind: rewind.premiumAccessKind,
		regenerationsLeft: rewind.regenerationsLeft,
		graceUsed: rewind.graceUsed,
		generatedAt: rewind.generatedAt,
		frozenAt: rewind.frozenAt
	};
}

export async function findAdminRewinds(query: AdminRewindsQuery) {
	const matchingUserIds = query.search
		? await usersService.findUserIdsMatchingSearch(query.search)
		: null;
	const { rows, count } = await Rewind.findAndCountAll({
		where: {
			...(query.year ? { year: query.year } : {}),
			...(matchingUserIds ? { userId: { [Op.in]: matchingUserIds } } : {})
		},
		order: [
			["generatedAt", "DESC"],
			["id", "DESC"]
		],
		limit: query.limit ?? DEFAULT_ADMIN_REWINDS_PAGE_SIZE,
		offset: query.offset ?? 0
	});
	const users = await findUsernamesById(rows.map(row => row.userId));
	return {
		items: rows.flatMap(row => {
			const user = users.get(row.userId);
			return user ? [toItem(row, user)] : [];
		}),
		total: count
	};
}

export async function updateAdminRewindRegenerations(
	rewindId: string,
	regenerationsLeft: number
): Promise<AdminRewindItem> {
	return sequelize.transaction(async transaction => {
		const locked = await Rewind.findByPk(rewindId, {
			lock: transaction.LOCK.UPDATE,
			transaction
		});
		if (!locked) throw rewindServiceError.notFoundError();
		const users = await findUsernamesById([locked.userId]);
		const user = users.get(locked.userId);
		if (!user) throw rewindServiceError.userNotFoundError();
		const updated = await locked.update(
			{ regenerationsLeft },
			{ transaction }
		);
		return toItem(updated, user);
	});
}
