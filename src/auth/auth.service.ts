import { LoginDto, RegisterDto } from "./dtos";
import * as userService from "../users/users.service";
import * as passwordService from "./services/password.service";
import * as tokenService from "./services/token.service";
import * as authDomainError from "./errors/auth.domains-error";

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
