import { type Transaction } from "sequelize";

import { environmentConfig } from "../common/config/environment.config";
import { PinoLogger } from "../common/logger/pino.logger";
import { sequelize } from "../database/sequelize.database";
import { mailProvider } from "../mail/mail.provider";
import * as userService from "../users/services/users.service";
import { type LoginDto, type RegisterDto } from "./dtos";
import * as authServiceError from "./errors/auth.service-error";
import * as passwordService from "./services/password.service";
import * as passwordResetService from "./services/password-reset.service";
import * as sessionService from "./services/session.service";
import * as tokenService from "./services/token.service";
import { buildPasswordResetEmail } from "./utils/password-reset-email.util";

const RESET_PASSWORD_PATH = "/reset-password";

const logger = new PinoLogger("Auth Service");

export async function register(registerDto: RegisterDto, deviceInfo?: string) {
	const [userEmail, userName] = await Promise.all([
		userService.findUserByEmail(registerDto.email),
		userService.findUserByUsername(registerDto.username)
	]);
	if (userEmail || userName) throw authServiceError.userAlreadyExistsError();

	const hashPassword = await passwordService.hashPassword(
		registerDto.password
	);

	const user = await userService.createUser({
		...registerDto,
		password: hashPassword
	});

	return { user, ...(await sessionService.issueSession(user, deviceInfo)) };
}

export async function login(loginDto: LoginDto, deviceInfo?: string) {
	const user = await userService.findUserByEmail(loginDto.email);
	if (!user) {
		await passwordService.burnPasswordCheck(loginDto.password);
		throw authServiceError.invalidCredentialsError();
	}

	const comparePassword = await passwordService.verifyPassword(
		loginDto.password,
		user.password
	);
	if (!comparePassword) throw authServiceError.invalidCredentialsError();

	return sessionService.issueSession(user, deviceInfo);
}

export async function refresh(rawRefreshToken: string, deviceInfo?: string) {
	const storedToken = await tokenService.verifyRefreshToken(rawRefreshToken);
	if (!storedToken) throw authServiceError.invalidRefreshTokenError();

	const user = await userService.findUserById(storedToken.userId);
	if (!user || !user.isActive)
		throw authServiceError.invalidRefreshTokenError();

	const wasClaimed = await tokenService.deleteRefreshToken(rawRefreshToken);
	if (!wasClaimed) throw authServiceError.invalidRefreshTokenError();

	return sessionService.issueSession(
		user,
		deviceInfo ?? storedToken.deviceInfo ?? undefined
	);
}

export async function logout(rawRefreshToken: string) {
	await tokenService.deleteRefreshToken(rawRefreshToken);
}

export async function changePassword(
	userId: string,
	currentPassword: string,
	newPassword: string
) {
	const hashPassword = await passwordService.hashPassword(newPassword);

	await sequelize.transaction(async transaction => {
		const user = await userService.findUserByIdForUpdate(
			userId,
			transaction
		);
		if (!user) throw authServiceError.invalidTokenError();

		const isCurrentPassword = await passwordService.verifyPassword(
			currentPassword,
			user.password
		);
		if (!isCurrentPassword)
			throw authServiceError.invalidCurrentPasswordError();

		await storePasswordAndRevokeSessions(
			user.id,
			hashPassword,
			transaction
		);
	});
}

async function storePasswordAndRevokeSessions(
	userId: string,
	hashPassword: string,
	transaction: Transaction
) {
	await userService.updatePassword(userId, hashPassword, transaction);
	await tokenService.deleteAllUserRefreshTokens(userId, transaction);
}

export async function listSessions(
	userId: string,
	options?: { limit?: number; offset?: number }
) {
	return tokenService.findUserSessions(userId, options);
}

export async function revokeSession(sessionId: string, userId: string) {
	const ok = await tokenService.deleteRefreshTokenById(sessionId, userId);
	if (!ok) throw authServiceError.invalidRefreshTokenError();
}

export async function revokeOtherSessions(
	userId: string,
	currentSessionId: string
) {
	return tokenService.deleteOtherUserRefreshTokens(userId, currentSessionId);
}

export function requestPasswordReset(email: string) {
	mailProvider.assertConfigured();

	sendPasswordResetEmail(email).catch(error =>
		logger.error("requestPasswordReset", "failed", {
			error: error instanceof Error ? error.message : String(error)
		})
	);
}

async function sendPasswordResetEmail(email: string) {
	const user = await userService.findUserByEmail(email);
	if (!user) return;

	const rawToken = await passwordResetService.createPasswordResetToken(
		user.id
	);
	if (!rawToken) return;

	const resetUrl = new URL(
		RESET_PASSWORD_PATH,
		environmentConfig.WEB_APP_URL
	);
	resetUrl.searchParams.set("token", rawToken);

	await mailProvider.send({
		to: user.email,
		...buildPasswordResetEmail(
			user.username,
			resetUrl.toString(),
			environmentConfig.PASSWORD_RESET_TOKEN_TTL_MINUTES,
			environmentConfig.WEB_APP_URL
		)
	});
}

export async function resetPassword(rawToken: string, password: string) {
	const userId = await passwordResetService.claimPasswordResetToken(rawToken);
	if (!userId) throw authServiceError.invalidPasswordResetTokenError();

	const user = await userService.findUserById(userId);
	if (!user) throw authServiceError.invalidPasswordResetTokenError();

	const hashPassword = await passwordService.hashPassword(password);

	await sequelize.transaction(transaction =>
		storePasswordAndRevokeSessions(user.id, hashPassword, transaction)
	);
}
