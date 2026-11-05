import * as activityService from "../../activity/activity.service";
import * as tokenService from "../../auth/services/token.service";
import * as backlogService from "../../backlog/backlog.service";
import * as backlogProgressService from "../../backlog-progress/backlog-progress.service";
import * as coopRunsService from "../../coop-runs/coop-runs.service";
import * as favoritesService from "../../favorites/favorites.service";
import * as franchisesService from "../../franchises/franchises.service";
import * as gamePlatinumService from "../../game-platinum/game-platinum.service";
import * as gameReportsService from "../../game-reports/game-reports.service";
import * as gameShelfService from "../../game-shelf/game-shelf.service";
import * as gamesService from "../../games/games.service";
import * as listFollowersService from "../../list-followers/list-followers.service";
import * as listsService from "../../lists/lists.service";
import * as moodTagsService from "../../mood-tags/mood-tags.service";
import { resolvePremiumStatus } from "../../premium-access/premium-access.service";
import * as premiumGrantsService from "../../premium-access/premium-grants-admin.service";
import * as queueService from "../../queue/queue.service";
import * as reviewsService from "../../reviews/reviews.service";
import * as rewindService from "../../rewind/rewind.service";
import * as savedFiltersService from "../../saved-filters/saved-filters.service";
import * as userFollowRequestsService from "../../user-follow-requests/user-follow-requests.service";
import * as userFollowersService from "../../user-followers/user-followers.service";
import { type User } from "../../users/user.model";
import * as wishlistService from "../../wishlist/wishlist.service";
import { type PersonalDataBundle } from "../data-requests.interface";
import { personalDataExportSerializer } from "../serializers/personal-data-export.serializer";
import * as dataRequestsService from "./data-requests.service";

async function collectBacklog(userId: string) {
	const backlog = await backlogService.findBacklogForDataExport(userId);
	const backlogIds = backlog.map(entry => entry.id);
	const [backlogProgress, coopPartnersByBacklog] = await Promise.all([
		backlogProgressService.findProgressForBacklogs(backlogIds),
		coopRunsService.findMembersForManyBacklogs(backlogIds)
	]);
	return { backlog, backlogProgress, coopPartnersByBacklog };
}

async function collectMoodTags(userId: string) {
	const [gameTags, tagMetas] = await Promise.all([
		moodTagsService.findGameTagsForDataExport(userId),
		moodTagsService.findTagMetasForDataExport(userId)
	]);
	const taggedGameIds = [...new Set(gameTags.map(tag => tag.gameId))];
	const taggedGames = await gamesService.findGamesByIds(taggedGameIds);
	return { gameTags, tagMetas, taggedGames };
}

async function collectPersonalData(user: User): Promise<PersonalDataBundle> {
	const userId = user.id;
	const [
		backlogData,
		moodTags,
		premiumStatus,
		premiumGrants,
		queue,
		gameShelf,
		wishlist,
		favorites,
		ownLists,
		followedLists,
		savedFilters,
		reviews,
		followers,
		following,
		followRequests,
		activities,
		trackedFranchises,
		platinums,
		rewinds,
		sessions,
		gameReports,
		dataRequests
	] = await Promise.all([
		collectBacklog(userId),
		collectMoodTags(userId),
		resolvePremiumStatus(user),
		premiumGrantsService.findPremiumGrantsByUserId(userId),
		queueService.findQueueByUserId(userId),
		gameShelfService.findGameShelfForDataExport(userId),
		wishlistService.findWishlistForDataExport(userId),
		favoritesService.findFavoritesForDataExport(userId),
		listsService.findOwnListsForDataExport(userId),
		listFollowersService.findFollowedListsForDataExport(userId),
		savedFiltersService.findSavedFiltersForDataExport(userId),
		reviewsService.findReviewsForDataExport(userId),
		userFollowersService.findFollowersForDataExport(userId),
		userFollowersService.findFollowingForDataExport(userId),
		userFollowRequestsService.findFollowRequestsForDataExport(userId),
		activityService.findActivitiesForDataExport(userId),
		franchisesService.findTrackedFranchisesForDataExport(userId),
		gamePlatinumService.findPlatinumsForDataExport(userId),
		rewindService.findRewindsForDataExport(userId),
		tokenService.findUserSessions(userId),
		gameReportsService.findReportsForDataExport(userId),
		dataRequestsService.findDataRequestsByUserId(userId)
	]);

	return {
		user,
		premiumStatus,
		premiumGrants,
		...backlogData,
		...moodTags,
		queue,
		gameShelf,
		wishlist,
		favorites,
		ownLists,
		followedLists,
		savedFilters,
		reviews,
		followers,
		following,
		followRequests,
		activities,
		trackedFranchises,
		platinums,
		rewinds,
		sessions: sessions.sessions,
		gameReports,
		dataRequests
	};
}

export async function buildPersonalDataExport(
	user: User,
	generatedAt = new Date()
) {
	const bundle = await collectPersonalData(user);
	return personalDataExportSerializer(bundle, generatedAt);
}
