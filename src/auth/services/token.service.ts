import crypto from "crypto";
import jwt from "jsonwebtoken";
import { environmentConfig } from "../../common/config/environment.config";
import type { StringValue } from "ms";
import { JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { RefreshToken } from "../refresh-token.model";

export function signAccessToken(payload: JwtPayload) {
	return jwt.sign(payload, environmentConfig.ACCESS_TOKEN_SECRET, {
		expiresIn: environmentConfig.ACCESS_TOKEN_TTL as StringValue
	});
}

export function verifyAccessToken(token: string): JwtPayload {
	return jwt.verify(
		token,
		environmentConfig.ACCESS_TOKEN_SECRET
	) as JwtPayload;
}

export async function createRefreshToken(userId: string): Promise<string> {
	const rawToken = crypto.randomBytes(64).toString("hex");
	const hashedToken = hashToken(rawToken);

	const expiresAt = new Date();
	expiresAt.setDate(
		expiresAt.getDate() + environmentConfig.REFRESH_TOKEN_TTL_DAYS
	);

	await RefreshToken.create({
		userId,
		token: hashedToken,
		expiresAt
	});

	return rawToken;
}

export async function verifyRefreshToken(
	rawToken: string
): Promise<RefreshToken | null> {
	const hashedToken = hashToken(rawToken);

	const refreshToken = await RefreshToken.findOne({
		where: { token: hashedToken }
	});

	if (!refreshToken) return null;
	if (refreshToken.expiresAt < new Date()) {
		await refreshToken.destroy();
		return null;
	}

	return refreshToken;
}

export async function deleteRefreshToken(rawToken: string): Promise<void> {
	const hashedToken = hashToken(rawToken);
	await RefreshToken.destroy({ where: { token: hashedToken } });
}

export async function deleteAllUserRefreshTokens(
	userId: string
): Promise<void> {
	await RefreshToken.destroy({ where: { userId } });
}

function hashToken(token: string): string {
	return crypto.createHash("sha256").update(token).digest("hex");
}
