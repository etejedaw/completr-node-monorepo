import { QueryTypes } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { sequelize } from "../database/sequelize.database";
import * as userFollowersService from "../user-followers/user-followers.service";
import { isSectionVisible } from "./helpers/visibility.helper";
import { type User } from "./user.model";
import {
	type FeaturedFavoriteRow,
	type UserCardInsights
} from "./users.interface";
import { type FeaturedGame } from "./users.types";

export async function buildUserCards(
	viewerId: string | undefined,
	users: User[]
): Promise<UserCardInsights[]> {
	const otherIds = users.map(user => user.id).filter(id => id !== viewerId);
	const edges = viewerId
		? await userFollowersService.findFollowEdges(viewerId, otherIds)
		: { followingIds: new Set<string>(), followerIds: new Set<string>() };
	const isMutual = (user: User) =>
		edges.followingIds.has(user.id) && edges.followerIds.has(user.id);
	const canSee = (user: User, section: "profile" | "backlog" | "favorite") =>
		isSectionVisible(viewerId, user, section, isMutual(user));

	const visibleUsers = users.filter(user => canSee(user, "profile"));
	const backlogOwners = visibleUsers
		.filter(user => canSee(user, "backlog"))
		.map(user => ({ userId: user.id, publicOnly: user.id !== viewerId }));
	const favoriteOwnerIds = visibleUsers
		.filter(user => canSee(user, "favorite"))
		.map(user => user.id);

	const [followerCounts, backlogCounts, featuredGames] = await Promise.all([
		userFollowersService.getFollowerCounts(
			visibleUsers.map(user => user.id)
		),
		backlogService.countBacklogByStatusForUsers(backlogOwners),
		findFeaturedFavorites(favoriteOwnerIds)
	]);

	return users.map(user => {
		const isSelf = viewerId === user.id;
		const profileVisible = canSee(user, "profile");
		const isFollowing = !isSelf && edges.followingIds.has(user.id);
		if (!profileVisible) {
			return {
				user,
				isSelf,
				profileVisible,
				followerCount: null,
				isFollowing,
				gamesTotal: null,
				completedTotal: null,
				featuredGame: null
			};
		}

		const backlogStats = backlogCounts.get(user.id);
		return {
			user,
			isSelf,
			profileVisible,
			followerCount: followerCounts.get(user.id) ?? 0,
			isFollowing,
			gamesTotal: backlogStats?.total ?? null,
			completedTotal: backlogStats?.completed ?? null,
			featuredGame: featuredGames.get(user.id) ?? null
		};
	});
}

async function findFeaturedFavorites(userIds: string[]) {
	const featured = new Map<string, FeaturedGame>();
	if (userIds.length === 0) return featured;

	const rows = await sequelize.query<FeaturedFavoriteRow>(
		`SELECT DISTINCT ON (f."userId") f."userId", g.title, g."backgroundUrl"
		 FROM "Favorites" AS f
		 LEFT JOIN "Games" AS g ON g.id = f."gameId"
		 WHERE f."userId" IN (:userIds)
		 ORDER BY f."userId", f.position ASC`,
		{ replacements: { userIds }, type: QueryTypes.SELECT }
	);
	for (const row of rows) {
		featured.set(
			row.userId,
			row.title === null
				? null
				: { title: row.title, backgroundUrl: row.backgroundUrl ?? null }
		);
	}
	return featured;
}
