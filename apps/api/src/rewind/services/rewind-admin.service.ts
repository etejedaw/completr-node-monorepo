import { Op } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type PremiumAccessUser } from "../../premium-access/premium-access.interface";
import { resolvePremiumAccess } from "../../premium-access/services/premium-access.service";
import * as usersService from "../../users/services/users.service";
import { type User } from "../../users/user.model";
import * as rewindServiceError from "../errors/rewind.service-error";
import {
	DEFAULT_ADMIN_REWINDS_PAGE_SIZE,
	type RewindPremiumAccessKind
} from "../rewind.constants";
import { Rewind } from "../rewind.model";
import { type AdminRewindItem } from "../rewind-admin.interface";
import { type AdminRewindsQuery } from "../schemas/admin-rewinds-query.schema";
import { resolveRewindPremiumAccessKind } from "../utils/resolve-rewind-premium-access-kind.util";

async function findOwnersById(userIds: string[]): Promise<Map<string, User>> {
	const users = await usersService.findUsersByIds([...new Set(userIds)]);
	return new Map(users.map(user => [user.id, user]));
}

async function resolveAiAccess(
	owner: PremiumAccessUser
): Promise<RewindPremiumAccessKind | null> {
	const access = await resolvePremiumAccess(owner, "rewind.premium");
	return resolveRewindPremiumAccessKind(access);
}

async function resolveAiAccessByOwnerId(
	owners: User[]
): Promise<Map<string, RewindPremiumAccessKind | null>> {
	const entries = await Promise.all(
		owners.map(
			async owner => [owner.id, await resolveAiAccess(owner)] as const
		)
	);
	return new Map(entries);
}

function toItem(
	rewind: Rewind,
	owner: User,
	aiAccess: RewindPremiumAccessKind | null
): AdminRewindItem {
	return {
		id: rewind.id,
		year: rewind.year,
		user: { id: owner.id, username: owner.username },
		premiumAccessKind: rewind.premiumAccessKind,
		aiAccess,
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
	const owners = await findOwnersById(rows.map(row => row.userId));
	const aiAccessByOwnerId = await resolveAiAccessByOwnerId([
		...owners.values()
	]);
	return {
		items: rows.flatMap(row => {
			const owner = owners.get(row.userId);
			return owner
				? [toItem(row, owner, aiAccessByOwnerId.get(owner.id) ?? null)]
				: [];
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
		const owners = await findOwnersById([locked.userId]);
		const owner = owners.get(locked.userId);
		if (!owner) throw rewindServiceError.userNotFoundError();
		const aiAccess = await resolveAiAccess(owner);
		if (!aiAccess) throw rewindServiceError.noAiAccessError();
		const updated = await locked.update(
			{ regenerationsLeft },
			{ transaction }
		);
		return toItem(updated, owner, aiAccess);
	});
}
