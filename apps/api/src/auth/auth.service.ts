import { environmentConfig } from "../common/config/environment.config";
import { PinoLogger } from "../common/logger/pino.logger";
import { mailProvider } from "../mail/mail.provider";
import * as userService from "../users/users.service";
import { type LoginDto, type RegisterDto } from "./dtos";
import * as authDomainError from "./errors/auth.domains-error";
import * as passwordService from "./services/password.service";
import * as passwordResetService from "./services/password-reset.service";
import * as tokenService from "./services/token.service";
import { buildPasswordResetEmail } from "./utils/password-reset-email.util";

const RESET_PASSWORD_PATH = "/reset-password";

const logger = new PinoLogger("Auth Service");

export async function register(registerDto: RegisterDto, deviceInfo?: string) {
	const userEmail = await userService.findUserByEmail(registerDto.email);
	const userName = await userService.findUserByUsername(registerDto.username);
	if (userEmail || userName) throw authDomainError.userAlreadyExists();

	const hashPassword = await passwordService.hashPassword(
		registerDto.password
	);

	const userData = {
		...registerDto,
		password: hashPassword
	};

	const user = await userService.createUser(userData);

	const { rawToken: refreshToken, sessionId } =
		await tokenService.createRefreshToken(user.id, deviceInfo);
	const accessToken = tokenService.signAccessToken({
		sub: user.id,
		username: user.username,
		email: user.email,
		sid: sessionId
	});

	return { user, accessToken, refreshToken, sessionId };
}

export async function login(loginDto: LoginDto, deviceInfo?: string) {
	const user = await userService.findUserByEmail(loginDto.email);
	if (!user) throw authDomainError.invalidCredentials();

	const comparePassword = await passwordService.verifyPassword(
		loginDto.password,
		user.password
	);
	if (!comparePassword) throw authDomainError.invalidCredentials();

	const { rawToken: refreshToken, sessionId } =
		await tokenService.createRefreshToken(user.id, deviceInfo);
	const accessToken = tokenService.signAccessToken({
		sub: user.id,
		username: user.username,
		email: user.email,
		sid: sessionId
	});

	return { accessToken, refreshToken, sessionId };
}

export async function refresh(rawRefreshToken: string, deviceInfo?: string) {
	const storedToken = await tokenService.verifyRefreshToken(rawRefreshToken);
	if (!storedToken) throw authDomainError.invalidRefreshToken();

	const user = await userService.findUserById(storedToken.userId);
	if (!user || !user.isActive) throw authDomainError.invalidRefreshToken();

	const previousDeviceInfo = storedToken.deviceInfo;
	await tokenService.deleteRefreshToken(rawRefreshToken);

	const { rawToken: refreshToken, sessionId } =
		await tokenService.createRefreshToken(
			user.id,
			deviceInfo ?? previousDeviceInfo ?? undefined
		);
	const accessToken = tokenService.signAccessToken({
		sub: user.id,
		username: user.username,
		email: user.email,
		sid: sessionId
	});

	return { accessToken, refreshToken, sessionId };
}

export async function logout(rawRefreshToken: string) {
	await tokenService.deleteRefreshToken(rawRefreshToken);
}

export async function changePassword(userId: string, password: string) {
	const hashPassword = await passwordService.hashPassword(password);

	await userService.updatePassword(userId, hashPassword);
	await tokenService.deleteAllUserRefreshTokens(userId);

	return true;
}

export async function listSessions(
	userId: string,
	options?: { limit?: number; offset?: number }
) {
	return tokenService.findUserSessions(userId, options);
}

export async function revokeSession(sessionId: string, userId: string) {
	const ok = await tokenService.deleteRefreshTokenById(sessionId, userId);
	if (!ok) throw authDomainError.invalidRefreshToken();
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
	if (!userId) throw authDomainError.invalidPasswordResetToken();

	const user = await userService.findUserById(userId);
	if (!user) throw authDomainError.invalidPasswordResetToken();

	await changePassword(user.id, password);
}
