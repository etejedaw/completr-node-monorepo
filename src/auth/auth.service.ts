import { LoginDto, RegisterDto } from "./dtos";
import * as userService from "../users/users.service";
import * as passwordService from "./services/password.service";
import * as tokenService from "./services/token.service";
import * as authDomainError from "./errors/auth.domains-error";

export async function register(registerDto: RegisterDto) {
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

	const payload = {
		sub: user.id,
		username: user.username,
		email: user.email
	};
	const accessToken = tokenService.signAccessToken(payload);
	const refreshToken = await tokenService.createRefreshToken(user.id);

	return { user, accessToken, refreshToken };
}

export async function login(loginDto: LoginDto) {
	const user = await userService.findUserByEmail(loginDto.email);
	if (!user) throw authDomainError.invalidCredentials();

	const comparePassword = await passwordService.verifyPassword(
		loginDto.password,
		user.password
	);
	if (!comparePassword) throw authDomainError.invalidCredentials();

	const payload = {
		sub: user.id,
		username: user.username,
		email: user.email
	};
	const accessToken = tokenService.signAccessToken(payload);
	const refreshToken = await tokenService.createRefreshToken(user.id);

	return { accessToken, refreshToken };
}

export async function refresh(rawRefreshToken: string) {
	const storedToken = await tokenService.verifyRefreshToken(rawRefreshToken);
	if (!storedToken) throw authDomainError.invalidRefreshToken();

	const user = await userService.findUserById(storedToken.userId);
	if (!user || !user.isActive) throw authDomainError.invalidRefreshToken();

	await tokenService.deleteRefreshToken(rawRefreshToken);

	const payload = {
		sub: user.id,
		username: user.username,
		email: user.email
	};
	const accessToken = tokenService.signAccessToken(payload);
	const refreshToken = await tokenService.createRefreshToken(user.id);

	return { accessToken, refreshToken };
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
