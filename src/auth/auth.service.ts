import { LoginDto, RegisterDto } from "./dtos";
import * as userService from "../users/users.service";
import * as passwordService from "./password.service";
import * as tokenService from "./token.service";

export async function register(registerDto: RegisterDto) {
	const userDb = await userService.findUserByEmail(registerDto.email);
	if (userDb) throw new Error("User already exists");

	const hashPassword = await passwordService.hashPassword(registerDto.password);

	const userData = {
		...registerDto,
		password: hashPassword,
		avatarUrl: registerDto.avatarUrl || "backlogr.app/default/profile.jpg"
	};

	const user = await userService.createUser(userData);

	const payload = { id: user.id, username: user.username, email: user.email };
	const accessToken = tokenService.signAccessToken(payload);

	return { user, accessToken };
}

export async function login(loginDto: LoginDto) {
	const user = await userService.findUserByEmail(loginDto.email);
	if (!user?.isActive) throw new Error("Invalid credentials");

	const comparePassword = await passwordService.verifyPassword(
		loginDto.password,
		user.password
	);
	if (!comparePassword) throw new Error("Invalid credentials");

	const payload = { id: user.id, username: user.username, email: user.email };
	const accessToken = tokenService.signAccessToken(payload);

	return { accessToken };
}

export async function changePassword(userId: string, password: string) {
	const hashPassword = await passwordService.hashPassword(password);

	const user = await userService.updatePassword(userId, hashPassword);
	if (!user) throw new Error("Invalid credentials");

	return true;
}
