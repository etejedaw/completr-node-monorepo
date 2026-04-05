import { Request, Response } from "express";
import { LoginDto, RegisterDto } from "./dtos";
import * as authService from "./auth.service";
import { userMeSerializer } from "../users";
import { ChangePassword } from "./schemas";
import { RequestUser } from "../common/interfaces/request-user.interface";

export async function postRegister(request: Request, response: Response) {
	const registerDto = request.locals.body as RegisterDto;

	const userRegister = await authService.register(registerDto);

	const userPlain = userRegister.user.get({ plain: true });
	const accessToken = userRegister.accessToken;

	const data = {
		user: userMeSerializer(userPlain),
		access_token: accessToken
	};

	return response.status(201).json({ data });
}

export async function postLogin(request: Request, response: Response) {
	const loginDto = request.locals.body as LoginDto;

	const userLogin = await authService.login(loginDto);

	const data = {
		access_token: userLogin.accessToken
	};

	return response.status(200).json({ data });
}

export async function patchChangePassword(
	request: Request,
	response: Response
) {
	const body = request.locals.body as ChangePassword;

	const user = request.locals.user as RequestUser;

	await authService.changePassword(user.id, body.password);

	return response.sendStatus(204);
}
