import { RequestUser } from "../common/interfaces/request-user.interface";
import { Request, Response } from "express";
import * as usersService from "./users.service";
import * as authService from "../auth/auth.service";
import * as backlogService from "../backlog/backlog.service";
import * as listsService from "../lists/lists.service";
import * as favoritesService from "../favorites/favorites.service";
import * as wishlistService from "../wishlist/wishlist.service";
import * as gameShelfService from "../game-shelf/game-shelf.service";
import * as activityService from "../activity/activity.service";
import * as userFollowersService from "../user-followers/user-followers.service";
import * as listFollowersService from "../list-followers/list-followers.service";
import { userMeSerializer, userProfileSerializer } from "./users.serializer";
import { backlogSerializer } from "../backlog/backlog.serializer";
import { listSummarySerializer } from "../lists/lists.serializer";
import { favoriteSerializer } from "../favorites/favorites.serializer";
import { wishlistSerializer } from "../wishlist/wishlist.serializer";
import { gameShelfMeSerializer } from "../game-shelf/serializers/game-shelf-me.serializer";
import { activitySerializer } from "../activity/activity.serializer";
import { UsernameParam } from "./schemas";
import { UpdateUserDto } from "./dtos";
import { RegisterDto } from "../auth/dtos";
import { SearchQuery } from "../common/schemas/search-query.schema";
import * as userDomain from "./errors/users.domain-error";

// TODO: Mejorar escritura de código
export async function getUserByUsername(request: Request, response: Response) {
	const params = request.locals.params as UsernameParam;

	const { username } = params;

	const user = await usersService.findUserByUsername(username);
	if (!user) throw userDomain.userNotFound();

	const currentUser = request.locals.user as RequestUser;
	const isSelf = currentUser.id === user.id;

	if (!user.isPublic && !isSelf) throw userDomain.userPrivate();

	const userId = user.id;

	const [
		backlogResult,
		lists,
		favorites,
		wishlist,
		gameShelfResult,
		followingLists,
		recentActivity,
		followerCount,
		followingCount,
		isFollowing
	] = await Promise.all([
		isSelf
			? backlogService.findBacklogByUserId(userId)
			: backlogService.findPublicBacklogByUserId(userId),
		isSelf
			? listsService.findListsByUserId(currentUser).then(r => r.lists)
			: listsService.findPublicListsByUserId(userId),
		isSelf || user.isFavoritePublic
			? favoritesService.findFavoritesByUserId(userId)
			: Promise.resolve([]),
		isSelf || user.isWishlistPublic
			? wishlistService.findWishlistByUserId(userId)
			: Promise.resolve([]),
		isSelf
			? gameShelfService.findGameShelfByUserId(userId).then(entries => ({
					rows: entries,
					total: entries.length
				}))
			: gameShelfService.findPublicGameShelfByUserId(userId),
		listFollowersService.getFollowingLists(userId),
		isSelf || user.isFeedPublic
			? activityService.getUserActivity(userId)
			: Promise.resolve([]),
		userFollowersService.getFollowerCount(userId),
		userFollowersService.getFollowingCount(userId),
		!isSelf
			? userFollowersService.isFollowing(currentUser.id, userId)
			: Promise.resolve(false)
	]);

	const backlogs = backlogResult.rows.map(b => b.get({ plain: true }));
	const gameShelf = gameShelfResult.rows.map(g => g.get({ plain: true }));

	const listsWithFollowers = await Promise.all(
		lists.map(async list => {
			const count = await listsService.getFollowerCount(list.id);
			return { ...listSummarySerializer(list), followerCount: count };
		})
	);

	const data = {
		user: userProfileSerializer(user.get({ plain: true })),
		followerCount,
		followingCount,
		isFollowing,
		backlogs: backlogs.map(backlogSerializer),
		lists: listsWithFollowers,
		favorites: favorites.map(favoriteSerializer),
		wishlist: wishlist.map(wishlistSerializer),
		gameShelf: gameShelf.map(gameShelfMeSerializer),
		followingLists: followingLists
			.filter(f => f.isVisible)
			.map(f => listSummarySerializer(f.List)),
		recentActivity: recentActivity.map(activitySerializer)
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

export async function searchUsers(request: Request, response: Response) {
	const { query } = request.locals.query as SearchQuery;

	const users = await usersService.searchUsers(query);

	const data = {
		users: users.map(u => ({
			id: u.id,
			username: u.username,
			name: u.name,
			avatarUrl: u.avatarUrl,
			isPublic: u.isPublic
		}))
	};
	return response.status(200).json({ data });
}

export async function getUserFollowingLists(
	request: Request,
	response: Response
) {
	const params = request.locals.params as UsernameParam;
	const query = request.locals.query ?? {};

	const user = await usersService.findUserByUsername(params.username);
	if (!user) throw userDomain.userNotFound();
	if (!user.isPublic) throw userDomain.userPrivate();

	const { rows, total } =
		await listFollowersService.getFollowingListsPaginated(user.id, query);

	const followingLists = rows
		.filter(f => f.isVisible)
		.map(f => listSummarySerializer(f.List));

	const data = { followingLists, total };
	return response.status(200).json({ data });
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
