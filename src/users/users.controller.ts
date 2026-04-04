import { Request, Response } from "express";
import * as usersService from "./users.service";
import { userMeSerializer, userPublicSerializer } from "./users.serializer";
import { UsernameParam } from "./schemas";
import { UpdateUserDto } from "./dtos";
import * as userDomain from "./errors/users.domain-error";
import { CustomRequest } from "../common/interfaces/custom-request.interface";

export async function getUserByUsername(request: Request, response: Response) {
	const params = request.params as UsernameParam;

	const { username } = params;

	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomain.userNotFound();
	if (!user.isPublic) throw userDomain.userPrivate();

	const userPlain = user.get({ plain: true });

	const data = { user: userPublicSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function getUserMe(request: Request, response: Response) {
	const customRequest = request as CustomRequest;

	const { id } = customRequest.user;

	const user = await usersService.findUserById(id);
	if (!user) throw userDomain.userNotFound();

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function patchUser(request: Request, response: Response) {
	const customRequest = request as CustomRequest;

	const updateUserDto = request.body as UpdateUserDto;
	const { id } = customRequest.user;

	const user = await usersService.updateUser(id, updateUserDto);
	if (!user) throw userDomain.userNotFound();

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function deleteUser(request: Request, response: Response) {
	const customRequest = request as CustomRequest;

	const { id } = customRequest.user;

	await usersService.deactivateUser(id);
	return response.sendStatus(204);
}
