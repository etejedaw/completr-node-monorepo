import { type Includeable, type WhereOptions } from "sequelize";

import { buildTextSearchWhere } from "../common/utils/text-search.util";
import { sequelize } from "../database/sequelize.database";
import { User } from "../users/user.model";
import * as rewindServiceError from "./errors/rewind.service-error";
import { Rewind } from "./rewind.model";
import { type AdminRewindItem } from "./rewind-admin.interface";
import { type AdminRewindsQuery } from "./schemas/rewind-admin.schemas";

const USER_ATTRIBUTES = ["id", "username"];

function toItem(rewind: Rewind, user: User): AdminRewindItem {
	return {
		id: rewind.id,
		year: rewind.year,
		user: { id: user.id, username: user.username },
		premiumAccessKind: rewind.premiumAccessKind,
		regenerationsLeft: rewind.regenerationsLeft,
		graceUsed: rewind.graceUsed,
		generatedAt: rewind.generatedAt,
		frozenAt: rewind.frozenAt
	};
}

export async function findAdminRewinds(query: AdminRewindsQuery) {
	const searchWhere = query.q
		? buildTextSearchWhere(query.q, ["User.username"])
		: null;
	const include: Includeable = {
		model: User,
		attributes: USER_ATTRIBUTES,
		required: true,
		...(searchWhere ? { where: searchWhere } : {})
	};
	const where: WhereOptions = query.year ? { year: query.year } : {};
	const { rows, count } = await Rewind.findAndCountAll({
		where,
		include: [include],
		order: [
			["generatedAt", "DESC"],
			["id", "DESC"]
		],
		limit: query.limit ?? 50,
		offset: query.offset ?? 0
	});
	return {
		items: rows.map(row => toItem(row, row.get("User") as User)),
		total: count
	};
}

export async function updateAdminRewindRegenerations(
	rewindId: string,
	regenerationsLeft: number
): Promise<AdminRewindItem> {
	const rewind = await sequelize.transaction(async transaction => {
		const locked = await Rewind.findByPk(rewindId, {
			lock: transaction.LOCK.UPDATE,
			transaction
		});
		if (!locked) throw rewindServiceError.notFoundError();
		return locked.update({ regenerationsLeft }, { transaction });
	});
	const user = await User.findByPk(rewind.userId, {
		attributes: USER_ATTRIBUTES
	});
	if (!user) throw rewindServiceError.userNotFoundError();
	return toItem(rewind, user);
}
