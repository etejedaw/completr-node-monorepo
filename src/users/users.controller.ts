import { Request, Response } from "express";
import * as usersService from "./users.service";
import { userSerializer } from "./users.serializer";
import { UpdateUser, UserIdParams, UsernameParams } from "./schemas";
import { AuthRequest } from "../common/interfaces/auth-request.interface";

export async function getUserByUsername(request: Request, response: Response) {
	const params = request.params as UsernameParams;

	const username = params.username;

	const user = await usersService.findUserByUsername(username);
	if (!user?.isPublic)
		return response.status(404).json({ message: "User not found" });

	const userPlain = user.get({ plain: true });

	return response.status(200).json({ user: userSerializer(userPlain) });
}

export async function patchUser(request: Request, response: Response) {
	const userBody = request.body as UpdateUser;
	const params = request.params as UserIdParams;

	const userId = params.userId;

	const user = await usersService.updateUser(userId, userBody);
	if (!user) return response.status(404).json({ message: "User not found" });

	const userPlain = user.get({ plain: true });

	return response.status(200).json({ user: userSerializer(userPlain) });
}

export async function getDeactivateUser(request: Request, response: Response) {
	const authRequest = request as AuthRequest;
	const userId = authRequest.user.id;

	await usersService.deactivateUser(userId);

	return response.sendStatus(204);
}

export async function getReactivateUser(request: Request, response: Response) {
	const authRequest = request as AuthRequest;
	const userId = authRequest.user.id;

	await usersService.reactivateUser(userId);

	return response.sendStatus(204);
}
