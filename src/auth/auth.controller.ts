import { Request, Response } from "express";
import { LoginDto, RegisterDto } from "./dtos";
import * as authService from "./auth.service";
import { userSerializer } from "../users";
import { ChangePassword } from "./schemas";
import { CustomRequest } from "../common/interfaces/custom-request.interface";

export async function postRegister(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const registerDto = customRequest.body as RegisterDto;

	const userRegister = await authService.register(registerDto);

	const userPlain = userRegister.user.get({ plain: true });
	const accessToken = userRegister.accessToken;

	const data = {
		user: userSerializer(userPlain),
		access_token: accessToken
	};

	return response.status(201).json({ data });
}

export async function postLogin(request: Request, response: Response) {
	const customRequest = request as CustomRequest;
	const loginDto = customRequest.body as LoginDto;

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
	const customRequest = request as CustomRequest;
	const body = request.body as ChangePassword;

	const user = customRequest.user;

	await authService.changePassword(user.id, body.password);

	return response.sendStatus(204);
}
