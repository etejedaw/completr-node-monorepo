import { Request, Response } from "express";
import { LoginDto, RegisterDto } from "./dtos";
import * as authService from "./auth.service";
import { userMeSerializer } from "../users";
import { ChangePassword } from "./schemas";
import { RefreshTokenBody } from "./schemas/refresh-token.schema";
import { RequestUser } from "../common/interfaces/request-user.interface";

export async function postRegister(request: Request, response: Response) {
	const registerDto = request.locals.body as RegisterDto;

	const userRegister = await authService.register(registerDto);

	const userPlain = userRegister.user.get({ plain: true });

	const data = {
		user: userMeSerializer(userPlain),
		access_token: userRegister.accessToken,
		refresh_token: userRegister.refreshToken
	};

	return response.status(201).json({ data });
}

export async function postLogin(request: Request, response: Response) {
	const loginDto = request.locals.body as LoginDto;

	const userLogin = await authService.login(loginDto);

	const data = {
		access_token: userLogin.accessToken,
		refresh_token: userLogin.refreshToken
	};

	return response.status(200).json({ data });
}

export async function postRefresh(request: Request, response: Response) {
	const { refresh_token } = request.locals.body as RefreshTokenBody;

	const tokens = await authService.refresh(refresh_token);

	const data = {
		access_token: tokens.accessToken,
		refresh_token: tokens.refreshToken
	};

	return response.status(200).json({ data });
}

export async function postLogout(request: Request, response: Response) {
	const { refresh_token } = request.locals.body as RefreshTokenBody;

	await authService.logout(refresh_token);

	return response.sendStatus(204);
}

export async function patchChangePassword(
	request: Request,
	response: Response
) {
	const changePassword = request.locals.body as ChangePassword;

	const user = request.locals.user as RequestUser;

	await authService.changePassword(user.id, changePassword.password);

	return response.sendStatus(204);
}
