import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { literal, Op, type Transaction } from "sequelize";

import { environmentConfig } from "../../common/config/environment.config";
import { MS_PER_MINUTE } from "../../common/constants/time.constants";
import { type JwtPayload } from "../../common/interfaces/jwt-payload.interface";
import { hashOneTimeToken } from "../../common/utils/one-time-token.util";
import { RefreshToken } from "../refresh-token.model";

const REFRESH_TOKEN_BYTES = 64;

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
	const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
	const tokenHash = hashOneTimeToken(rawToken);

	const expiresAt = new Date();
	expiresAt.setDate(
		expiresAt.getDate() + environmentConfig.REFRESH_TOKEN_TTL_DAYS
	);

	const created = await RefreshToken.create({
		userId,
		token: tokenHash,
		expiresAt,
		deviceInfo: deviceInfo ?? null,
		lastUsedAt: new Date()
	});

	return { rawToken, sessionId: created.id };
}

export async function verifyRefreshToken(
	rawToken: string
): Promise<RefreshToken | null> {
	const refreshToken = await RefreshToken.findOne({
		where: { token: hashOneTimeToken(rawToken) }
	});

	if (!refreshToken) return null;
	if (refreshToken.expiresAt < new Date()) {
		await refreshToken.destroy();
		return null;
	}

	return refreshToken;
}

const lastUsedUpdateCache = new Map<string, number>();
const LAST_USED_THROTTLE_MS = MS_PER_MINUTE;

function forgetStaleLastUsedEntries(now: number) {
	for (const [sessionId, updatedAt] of lastUsedUpdateCache) {
		if (now - updatedAt >= LAST_USED_THROTTLE_MS)
			lastUsedUpdateCache.delete(sessionId);
	}
}

export async function touchSessionLastUsed(sessionId: string): Promise<void> {
	const now = Date.now();
	const lastUpdate = lastUsedUpdateCache.get(sessionId);
	if (lastUpdate && now - lastUpdate < LAST_USED_THROTTLE_MS) return;
	forgetStaleLastUsedEntries(now);
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
		order: [literal('"lastUsedAt" DESC NULLS LAST'), ["id", "DESC"]],
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

export async function deleteRefreshToken(rawToken: string): Promise<boolean> {
	const deleted = await RefreshToken.destroy({
		where: { token: hashOneTimeToken(rawToken) }
	});
	return deleted > 0;
}

export async function deleteAllUserRefreshTokens(
	userId: string,
	transaction?: Transaction
): Promise<void> {
	await RefreshToken.destroy({ where: { userId }, transaction });
}
