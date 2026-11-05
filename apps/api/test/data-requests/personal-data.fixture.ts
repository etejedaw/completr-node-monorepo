import { Activity } from "../../src/activity/activity.model";
import { ActivityGame } from "../../src/activity/targets/activity-game.model";
import { ActivityUser } from "../../src/activity/targets/activity-user.model";
import { BacklogProgress } from "../../src/backlog-progress/backlog-progress.model";
import { hashOneTimeToken } from "../../src/common/utils/one-time-token.util";
import { CoopRun } from "../../src/coop-runs/coop-run.model";
import { DataRequest } from "../../src/data-requests/data-request.model";
import { Favorite } from "../../src/favorites/favorite.model";
import { UserFranchise } from "../../src/franchises/user-franchise.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { GameReport } from "../../src/game-reports/game-report.model";
import { UserInvitation } from "../../src/invitations/user-invitation.model";
import { ListFollower } from "../../src/list-followers/list-follower.model";
import { ListItem } from "../../src/list-items/list-item.model";
import { MoodTagMeta } from "../../src/mood-tags/mood-tag-meta.model";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { Queue } from "../../src/queue/queue.model";
import { Review } from "../../src/reviews/review.model";
import { Rewind } from "../../src/rewind/rewind.model";
import { UserFollowRequest } from "../../src/user-follow-requests/user-follow-request.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { type User } from "../../src/users/user.model";
import {
	createBacklog,
	createFranchise,
	createGame,
	createList,
	createPlatform,
	createSavedFilter,
	createScoreSource,
	createShelfEntries,
	createUser,
	createWishlistEntries
} from "../helpers/factories.helper";

const DAY_MS = 24 * 60 * 60 * 1000;

export const PRIVATE_BACKLOG_NOTE = "I hid the key under the plant";
export const AI_RECAP_TEXT = "A year of cozy co-op adventures.";

async function seedCoopRun(
	owner: User,
	partner: User,
	gameId: string,
	platformId: string
) {
	const coopRun = await CoopRun.create({ gameId });
	const ownBacklog = await createBacklog(owner.id, gameId, platformId, {
		status: "playing"
	});
	const partnerBacklog = await createBacklog(partner.id, gameId, platformId);
	await ownBacklog.update({
		coopRunId: coopRun.id,
		notes: PRIVATE_BACKLOG_NOTE
	});
	await partnerBacklog.update({ coopRunId: coopRun.id });
	await BacklogProgress.create({
		backlogId: ownBacklog.id,
		note: "Reached chapter 3"
	});
	return { ownBacklog, partnerBacklog };
}

async function seedLists(owner: User, partner: User, gameId: string) {
	const scoreSource = await createScoreSource();
	const ownList = await createList(owner.id, scoreSource.code, {
		name: "Comfort games",
		isPublic: true
	});
	await ListItem.create({ listId: ownList.id, gameId, position: 1 });
	const partnerList = await createList(partner.id, scoreSource.code, {
		name: "Partner picks",
		isPublic: true
	});
	await ListFollower.create({ listId: partnerList.id, userId: owner.id });
	await ListFollower.create({ listId: ownList.id, userId: partner.id });
	return { ownList, partnerList };
}

async function seedSocialGraph(owner: User, partner: User, requester: User) {
	await UserFollower.create({
		followerId: partner.id,
		followingId: owner.id
	});
	await UserFollower.create({
		followerId: owner.id,
		followingId: partner.id
	});
	await UserFollowRequest.create({
		requesterId: requester.id,
		targetId: owner.id
	});
}

async function seedActivity(owner: User, partner: User, gameId: string) {
	const ownActivity = await Activity.create({
		userId: owner.id,
		type: "backlog_added"
	});
	await ActivityGame.create({ activityId: ownActivity.id, gameId });

	const partnerActivityAboutOwner = await Activity.create({
		userId: partner.id,
		type: "user_followed"
	});
	await ActivityUser.create({
		activityId: partnerActivityAboutOwner.id,
		targetUserId: owner.id
	});

	const partnerUnrelatedActivity = await Activity.create({
		userId: partner.id,
		type: "backlog_added"
	});
	await ActivityGame.create({
		activityId: partnerUnrelatedActivity.id,
		gameId
	});

	return { partnerActivityAboutOwner, partnerUnrelatedActivity };
}

async function seedPremiumAndRewind(owner: User) {
	await PremiumGrant.create({
		userId: owner.id,
		feature: "lists.unlimited",
		expiresAt: new Date(Date.now() + 30 * DAY_MS)
	});
	await Rewind.create({
		userId: owner.id,
		year: 2025,
		language: "en",
		generatedAt: new Date(),
		aiRecap: { text: AI_RECAP_TEXT },
		aiRecapStatus: "ready",
		premiumStats: { longestStreakDays: 12 }
	});
}

export async function seedPersonalData(owner: User) {
	const partner = await createUser();
	const requester = await createUser();
	const platform = await createPlatform();
	const game = await createGame({ title: "Cozy Grove" });
	const wishedGame = await createGame({ title: "Wished Game" });
	const franchise = await createFranchise();

	const { ownBacklog, partnerBacklog } = await seedCoopRun(
		owner,
		partner,
		game.id,
		platform.id
	);
	await Queue.create({
		userId: owner.id,
		backlogId: ownBacklog.id,
		position: 1
	});
	await createShelfEntries(owner.id, game.id, platform.id, 1);
	await createWishlistEntries(owner.id, [wishedGame.id], platform.id);
	await Favorite.create({ userId: owner.id, gameId: game.id, position: 1 });
	const { ownList, partnerList } = await seedLists(owner, partner, game.id);
	await createSavedFilter(owner.id, { name: "Short games" });
	await Review.create({
		userId: owner.id,
		gameId: game.id,
		content: "Lovely",
		rating: 4.5
	});
	await seedSocialGraph(owner, partner, requester);
	const activities = await seedActivity(owner, partner, game.id);
	await UserGameTag.create({
		userId: owner.id,
		gameId: game.id,
		tag: "cozy"
	});
	await MoodTagMeta.create({
		userId: owner.id,
		tag: "cozy",
		description: "Rainy days"
	});
	await UserFranchise.create({ userId: owner.id, franchiseId: franchise.id });
	await GamePlatinum.create({
		userId: owner.id,
		gameId: game.id,
		platformId: platform.id,
		platinumedAt: "2026-05-01",
		notes: "Finally"
	});
	await seedPremiumAndRewind(owner);
	await GameReport.create({
		gameId: game.id,
		userId: owner.id,
		message: "Wrong duration",
		category: "general"
	});
	await UserInvitation.create({
		email: owner.email,
		tokenHash: hashOneTimeToken(`invite-${owner.id}`),
		invitedById: null,
		expiresAt: new Date(Date.now() + DAY_MS)
	});
	await DataRequest.create({ userId: owner.id, type: "export" });

	return {
		partner,
		requester,
		game,
		franchise,
		ownList,
		partnerList,
		partnerBacklog,
		...activities
	};
}
