import crypto from "crypto";
import jwt from "jsonwebtoken";
import { literal, Op } from "sequelize";
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

export async function createRefreshToken(
	userId: string,
	deviceInfo?: string
): Promise<{ rawToken: string; sessionId: string }> {
	const rawToken = crypto.randomBytes(64).toString("hex");
	const hashedToken = hashToken(rawToken);

	const expiresAt = new Date();
	expiresAt.setDate(
		expiresAt.getDate() + environmentConfig.REFRESH_TOKEN_TTL_DAYS
	);

	const created = await RefreshToken.create({
		userId,
		token: hashedToken,
		expiresAt,
		deviceInfo: deviceInfo ?? null,
		lastUsedAt: new Date()
	});

	return { rawToken, sessionId: created.id };
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

const lastUsedUpdateCache = new Map<string, number>();
const LAST_USED_THROTTLE_MS = 60_000;

export async function touchSessionLastUsed(sessionId: string): Promise<void> {
	const now = Date.now();
	const lastUpdate = lastUsedUpdateCache.get(sessionId);
	if (lastUpdate && now - lastUpdate < LAST_USED_THROTTLE_MS) return;
	lastUsedUpdateCache.set(sessionId, now);
	await RefreshToken.update(
		{ lastUsedAt: new Date() },
		{ where: { id: sessionId } }
	);
}

export async function findUserSessions(
	userId: string,
	options?: { limit?: number; offset?: number }
) {
	const { rows, count } = await RefreshToken.findAndCountAll({
		where: { userId },
		order: literal('"lastUsedAt" DESC NULLS LAST'),
		attributes: [
			"id",
			"deviceInfo",
			"lastUsedAt",
			"createdAt",
			"expiresAt"
		],
		limit: options?.limit,
		offset: options?.offset
	});
	return { sessions: rows, total: count };
}

export async function deleteOtherUserRefreshTokens(
	userId: string,
	exceptSessionId: string
): Promise<number> {
	return RefreshToken.destroy({
		where: { userId, id: { [Op.ne]: exceptSessionId } }
	});
}

export async function deleteRefreshTokenById(
	id: string,
	userId: string
): Promise<boolean> {
	const deleted = await RefreshToken.destroy({ where: { id, userId } });
	return deleted > 0;
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
