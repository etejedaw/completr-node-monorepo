import { Op, type Transaction } from "sequelize";

import { environmentConfig } from "../../common/config/environment.config";
import { MS_PER_MINUTE } from "../../common/constants/time.constants";
import { acquireAdvisoryLock } from "../../common/utils/acquire-advisory-lock.util";
import {
	generateOneTimeToken,
	hashOneTimeToken
} from "../../common/utils/one-time-token.util";
import { sequelize } from "../../database/sequelize.database";
import { PasswordResetToken } from "../password-reset-token.model";

async function lockPasswordResetsOf(userId: string, transaction: Transaction) {
	await acquireAdvisoryLock(`password-reset:${userId}`, transaction);
}

async function isInCooldown(userId: string, transaction: Transaction) {
	const cooldownStart = new Date(
		Date.now() -
			environmentConfig.PASSWORD_RESET_COOLDOWN_MINUTES * MS_PER_MINUTE
	);
	const recentTokens = await PasswordResetToken.count({
		where: { userId, createdAt: { [Op.gt]: cooldownStart } },
		transaction
	});
	return recentTokens > 0;
}

export async function createPasswordResetToken(
	userId: string
): Promise<string | null> {
	return sequelize.transaction(async transaction => {
		await lockPasswordResetsOf(userId, transaction);
		if (await isInCooldown(userId, transaction)) return null;

		await PasswordResetToken.destroy({ where: { userId }, transaction });

		const { rawToken, tokenHash } = generateOneTimeToken();
		const expiresAt = new Date(
			Date.now() +
				environmentConfig.PASSWORD_RESET_TOKEN_TTL_MINUTES *
					MS_PER_MINUTE
		);

		await PasswordResetToken.create(
			{ userId, tokenHash, expiresAt },
			{ transaction }
		);

		return rawToken;
	});
}

export async function claimPasswordResetToken(
	rawToken: string
): Promise<string | null> {
	const resetToken = await PasswordResetToken.findOne({
		where: {
			tokenHash: hashOneTimeToken(rawToken),
			expiresAt: { [Op.gt]: new Date() }
		}
	});
	if (!resetToken) return null;

	const claimed = await PasswordResetToken.destroy({
		where: { id: resetToken.id }
	});
	if (claimed === 0) return null;

	await PasswordResetToken.destroy({
		where: { userId: resetToken.userId }
	});

	return resetToken.userId;
}
