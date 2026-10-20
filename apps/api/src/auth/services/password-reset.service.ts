import { Op } from "sequelize";

import { environmentConfig } from "../../common/config/environment.config";
import {
	generateOneTimeToken,
	hashOneTimeToken
} from "../../common/utils/one-time-token.util";
import { PasswordResetToken } from "../password-reset-token.model";

const MINUTES_TO_MS = 60_000;

export async function createPasswordResetToken(
	userId: string
): Promise<string> {
	await PasswordResetToken.destroy({ where: { userId } });

	const { rawToken, tokenHash } = generateOneTimeToken();
	const expiresAt = new Date(
		Date.now() +
			environmentConfig.PASSWORD_RESET_TOKEN_TTL_MINUTES * MINUTES_TO_MS
	);

	await PasswordResetToken.create({ userId, tokenHash, expiresAt });

	return rawToken;
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
