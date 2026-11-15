import { type Transaction } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import * as premiumAccessServiceError from "../errors/premium-access.service-error";
import { FULL_PREMIUM_FEATURE } from "../premium-access.constants";
import { type PremiumGrantExpirationInput } from "../premium-access.interface";
import { type UpdatePremiumGrantExpirationInput } from "../premium-access.types";
import { PremiumGrant } from "../premium-grant.model";

export async function createPremiumGrant(
	userId: string,
	input: PremiumGrantExpirationInput,
	now = new Date()
) {
	return PremiumGrant.create({
		userId,
		feature: input.feature,
		expiresAt: resolveExpiration(input, now),
		offerCode: null
	});
}

export async function findPremiumGrantsByUserId(userId: string) {
	return PremiumGrant.findAll({
		where: { userId },
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function updatePremiumGrantExpiration(
	userId: string,
	grantId: string,
	input: UpdatePremiumGrantExpirationInput,
	now?: Date
) {
	return sequelize.transaction(async transaction => {
		const grant = await lockOwnedGrant(userId, grantId, transaction);
		const lockedAt = now ?? new Date();
		assertGrantIsActive(grant, lockedAt);
		return grant.update(
			{
				expiresAt: resolveExpiration(
					{ ...input, feature: grant.feature },
					lockedAt
				)
			},
			{ transaction }
		);
	});
}

export async function revokePremiumGrant(
	userId: string,
	grantId: string,
	now?: Date
) {
	return sequelize.transaction(async transaction => {
		const grant = await lockOwnedGrant(userId, grantId, transaction);
		const lockedAt = now ?? new Date();
		assertGrantIsActive(grant, lockedAt);
		return grant.update({ expiresAt: lockedAt }, { transaction });
	});
}

async function lockOwnedGrant(
	userId: string,
	grantId: string,
	transaction: Transaction
) {
	const grant = await PremiumGrant.findOne({
		where: { id: grantId, userId },
		lock: transaction.LOCK.UPDATE,
		transaction
	});
	if (!grant) throw premiumAccessServiceError.premiumGrantNotFound();
	return grant;
}

function assertGrantIsActive(grant: PremiumGrant, now: Date) {
	if (grant.expiresAt !== null && grant.expiresAt <= now)
		throw premiumAccessServiceError.premiumGrantNotActive();
}

function resolveExpiration(input: PremiumGrantExpirationInput, now: Date) {
	if (input.feature === FULL_PREMIUM_FEATURE && input.expiresAt === null)
		throw premiumAccessServiceError.premiumGrantInvalidExpiration();
	if (input.expiresAt === null) return null;

	const expiresAt = new Date(input.expiresAt);
	if (expiresAt <= now)
		throw premiumAccessServiceError.premiumGrantInvalidExpiration();
	return expiresAt;
}
