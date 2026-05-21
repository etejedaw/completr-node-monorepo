import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as usersService from "../users/users.service";
import * as userDomainError from "../users/errors/users.domain-error";
import * as wishlistService from "./wishlist.service";
import { ReplaceWishlistBody } from "./schemas/replace-wishlist.schema";
import { AddWishlistBody } from "./schemas/add-wishlist.schema";
import { WishlistGameParams } from "./schemas/wishlist-game-params.schema";
import { UsernameParam } from "../users/schemas/username-params.schema";
import { wishlistSerializer } from "./wishlist.serializer";

export async function putWishlist(request: Request, response: Response) {
	const body = request.locals.body as ReplaceWishlistBody;
	const user = request.locals.user as RequestUser;

	const entries = await wishlistService.replaceWishlist(user, body.gameIds);
	const entriesPlain = entries.map(e => e.get({ plain: true }));

	const data = { wishlist: entriesPlain.map(wishlistSerializer) };
	return response.status(200).json({ data });
}

export async function postWishlist(request: Request, response: Response) {
	const body = request.locals.body as AddWishlistBody;
	const user = request.locals.user as RequestUser;

	const entry = await wishlistService.addToWishlist(user, body.gameId);
	const entryPlain = entry!.get({ plain: true });

	const data = { wishlist: wishlistSerializer(entryPlain) };
	return response.status(201).json({ data });
}

export async function deleteWishlistItem(request: Request, response: Response) {
	const params = request.locals.params as WishlistGameParams;
	const user = request.locals.user as RequestUser;

	await wishlistService.removeFromWishlist(user, params.gameId);
	return response.sendStatus(204);
}

export async function getMeWishlist(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query ?? {};

	const { rows, total } = await wishlistService.findWishlistByUserIdPaginated(
		user.id,
		query
	);
	const entriesPlain = rows.map(e => e.get({ plain: true }));

	const data = { wishlist: entriesPlain.map(wishlistSerializer), total };
	return response.status(200).json({ data });
}

export async function getUserWishlist(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomainError.userNotFound();
	if (!user.isPublic) throw userDomainError.userPrivate();
	if (!user.isWishlistPublic) throw userDomainError.userPrivate();

	const { rows, total } = await wishlistService.findWishlistByUserIdPaginated(
		user.id,
		query
	);
	const entriesPlain = rows.map(e => e.get({ plain: true }));

	const data = { wishlist: entriesPlain.map(wishlistSerializer), total };
	return response.status(200).json({ data });
}
