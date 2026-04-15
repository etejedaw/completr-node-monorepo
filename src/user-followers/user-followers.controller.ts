import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { UsernameParam } from "../users/schemas/username-params.schema";
import * as userFollowersService from "./user-followers.service";

export async function postFollow(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const user = request.locals.user as RequestUser;

	await userFollowersService.follow(user.id, username);
	return response.sendStatus(201);
}

export async function deleteFollow(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;
	const user = request.locals.user as RequestUser;

	await userFollowersService.unfollow(user.id, username);
	return response.sendStatus(204);
}

export async function getFollowers(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;

	const followers = await userFollowersService.getFollowers(username);
	const data = followers.map(f => f.Follower);

	return response.status(200).json({ data: { users: data } });
}

export async function getFollowing(request: Request, response: Response) {
	const { username } = request.locals.params as UsernameParam;

	const following = await userFollowersService.getFollowing(username);
	const data = following.map(f => f.Following);

	return response.status(200).json({ data: { users: data } });
}
