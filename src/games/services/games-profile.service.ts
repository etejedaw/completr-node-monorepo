import * as backlogService from "../../backlog/backlog.service";
import * as listsService from "../../lists/lists.service";
import * as userFollowersService from "../../user-followers/user-followers.service";
import {
	type EnrichedGameList,
	type GameListsBundle
} from "../games.interface";

export async function getListsForGame(
	viewerId: string,
	gameId: string
): Promise<GameListsBundle> {
	const [publicLists, myLists] = await Promise.all([
		listsService.findPublicListsByGameId(gameId),
		listsService.findUserListsWithGameFlag(viewerId, gameId)
	]);

	const enriched = await Promise.all(
		publicLists.map(list => enrichGameList(list, viewerId))
	);

	enriched.sort((a, b) => {
		if (a.isOfficial && !b.isOfficial) return -1;
		if (!a.isOfficial && b.isOfficial) return 1;
		return 0;
	});

	return { lists: enriched, myLists };
}

async function enrichGameList(
	list: Awaited<
		ReturnType<typeof listsService.findPublicListsByGameId>
	>[number],
	viewerId: string
): Promise<EnrichedGameList> {
	const progress = await listsService.getListProgress(list.id, viewerId);
	return {
		id: list.id,
		name: list.name,
		description: list.description,
		isOfficial: list.User?.role === "admin",
		ownerUsername: list.User?.username ?? null,
		completed: progress.total > 0 && progress.completed === progress.total
	};
}

export async function getFriendsActivityForGame(
	viewerId: string,
	gameId: string
) {
	const friendIds = await userFollowersService.getFollowingIds(viewerId);
	return backlogService.findFriendsActivityForGame(friendIds, gameId);
}

export async function getPlayersForGame(viewerId: string, gameId: string) {
	const friendIds = await userFollowersService.getFollowingIds(viewerId);
	return backlogService.findRandomPlayersForGame(gameId, viewerId, friendIds);
}
