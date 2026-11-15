import * as backlogStatsService from "../backlog/services/backlog-stats.service";
import * as favoritesService from "../favorites/favorites.service";
import { findFullPremiumUserIds } from "../premium-access/premium-access.service";
import * as userFollowersService from "../user-followers/user-followers.service";
import { isSectionVisible } from "./helpers/visibility.helper";
import { type User } from "./user.model";
import { type UserCardInsights } from "./users.interface";

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

	const [followerCounts, backlogCounts, featuredGames, premiumUserIds] =
		await Promise.all([
			userFollowersService.getFollowerCounts(
				visibleUsers.map(user => user.id)
			),
			backlogStatsService.countBacklogByStatusForUsers(backlogOwners),
			favoritesService.findFeaturedFavoritesByUserIds(favoriteOwnerIds),
			findFullPremiumUserIds(users)
		]);

	return users.map(user => {
		const isSelf = viewerId === user.id;
		const hasPremium = premiumUserIds.has(user.id);
		const profileVisible = canSee(user, "profile");
		const isFollowing = !isSelf && edges.followingIds.has(user.id);
		if (!profileVisible) {
			return {
				user,
				hasPremium,
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
			hasPremium,
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
