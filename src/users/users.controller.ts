import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as usersService from "./users.service";
import * as authService from "../auth/auth.service";
import * as backlogService from "../backlog/backlog.service";
import * as listsService from "../lists/lists.service";
import * as favoritesService from "../favorites/favorites.service";
import * as wishlistService from "../wishlist/wishlist.service";
import { userMeSerializer, userProfileSerializer } from "./users.serializer";
import { backlogSerializer } from "../backlog/backlog.serializer";
import { listSummarySerializer } from "../lists/lists.serializer";
import { favoriteSerializer } from "../favorites/favorites.serializer";
import { wishlistSerializer } from "../wishlist/wishlist.serializer";
import { UsernameParam } from "./schemas";
import { UpdateUserDto } from "./dtos";
import { RegisterDto } from "../auth/dtos";
import * as userDomain from "./errors/users.domain-error";

// TODO: Mejorar escritura de código
export async function getUserByUsername(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;

	const { username } = params;

	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomain.userNotFound();
	if (!user.isPublic) throw userDomain.userPrivate();

	const userId = user.id;

	const [backlogs, lists, favorites, wishlist] = await Promise.all([
		backlogService.findPublicBacklogByUserId(userId),
		listsService.findPublicListsByUserId(userId),
		user.isFavoritePublic
			? favoritesService.findFavoritesByUserId(userId)
			: Promise.resolve([]),
		user.isWishlistPublic
			? wishlistService.findWishlistByUserId(userId)
			: Promise.resolve([])
	]);

	const data = {
		user: userProfileSerializer(user.get({ plain: true })),
		backlogs: backlogs.map(backlogSerializer),
		lists: lists.map(listSummarySerializer),
		favorites: favorites.map(favoriteSerializer),
		wishlist: wishlist.map(wishlistSerializer)
	};

	return response.status(200).json({ data });
}

export async function getUserMe(request: Request, response: Response) {
	const { id } = request.locals.user as RequestUser;

	const user = await usersService.findUserById(id);
	if (!user) throw userDomain.userNotFound();

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function patchUser(request: Request, response: Response) {
	const updateUserDto = request.locals.body as UpdateUserDto;
	const { id } = request.locals.user as RequestUser;

	const user = await usersService.updateUser(id, updateUserDto);
	if (!user) throw userDomain.userNotFound();

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(200).json({ data });
}

export async function deleteUser(request: Request, response: Response) {
	const { id } = request.locals.user as RequestUser;

	await usersService.deactivateUser(id);
	return response.sendStatus(204);
}

export async function postAdminCreateUser(
	request: Request,
	response: Response
) {
	const registerDto = request.locals.body as RegisterDto;

	const { user } = await authService.register(registerDto);

	const userPlain = user.get({ plain: true });

	const data = { user: userMeSerializer(userPlain) };
	return response.status(201).json({ data });
}
