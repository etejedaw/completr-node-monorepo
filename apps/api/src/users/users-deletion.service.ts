import { type Transaction } from "sequelize";

import * as activityService from "../activity/activity.service";
import * as auditService from "../audit/audit.service";
import { sequelize } from "../database/sequelize.database";
import * as invitationsService from "../invitations/invitations.service";
import { clearRewindImagesOf } from "../rewind-share/rewind-share.service";
import * as usersServiceError from "./errors/users.service-error";
import { type User } from "./user.model";
import * as usersService from "./users.service";

export async function findDeletableUser(userId: string, actingAdminId: string) {
	const user = await usersService.findUserByIdUnfiltered(userId);
	if (!user) throw usersServiceError.notFoundError();
	if (user.role === "admin" || user.id === actingAdminId)
		throw usersServiceError.deleteForbiddenError();
	return user;
}

export async function deleteAccount(
	user: User,
	actingAdminId: string
): Promise<void>;
export async function deleteAccount<Result>(
	user: User,
	actingAdminId: string,
	withinTransaction: (transaction: Transaction) => Promise<Result>
): Promise<Result>;
export async function deleteAccount<Result>(
	user: User,
	actingAdminId: string,
	withinTransaction?: (transaction: Transaction) => Promise<Result>
) {
	const result = await sequelize.transaction(async transaction => {
		const hookResult = await withinTransaction?.(transaction);
		await activityService.deleteActivitiesTargetingUser(
			user.id,
			transaction
		);
		await invitationsService.deleteInvitationsByEmail(
			user.email,
			transaction
		);
		await usersService.destroyUser(user.id, transaction);
		return hookResult;
	});

	clearRewindImagesOf(user.username);
	auditService.record(actingAdminId, "user_deleted", "user", user.id);
	return result;
}
