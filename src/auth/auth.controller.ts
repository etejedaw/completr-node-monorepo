import { Request, Response } from "express";
import { LoginDto, RegisterDto } from "./dtos";
import * as authService from "./auth.service";
import { userSerializer } from "../users";
import { AuthRequest } from "./interfaces/auth-request.interface";
import { ChangePassword } from "./schemas";

export async function postRegister(request: Request, response: Response) {
	const body = request.body as RegisterDto;

	const userRegister = await authService.register(body);

	const userPlain = userRegister.user.get({ plain: true });
	const accessToken = userRegister.accessToken;

	const data = {
		user: userSerializer(userPlain),
		access_token: accessToken
	};

	return response.status(201).json({ data });
}

export async function postLogin(request: Request, response: Response) {
	const body = request.body as LoginDto;

	const userLogin = await authService.login(body);

	const data = {
		access_token: userLogin.accessToken
	};

	return response.status(200).json({ data });
}

export async function patchChangePassword(
	request: Request,
	response: Response
) {
	const requestAuth = request as AuthRequest;
	const body = request.body as ChangePassword;
	const user = requestAuth.user;

	await authService.changePassword(user.id, body.password);

	return response.sendStatus(204);
}
