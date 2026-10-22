import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity, type ActivityType } from "../../src/activity/activity.model";
import { ActivityGame } from "../../src/activity/targets/activity-game.model";
import { ActivityList } from "../../src/activity/targets/activity-list.model";
import { ActivityUser } from "../../src/activity/targets/activity-user.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createList,
	createScoreSource
} from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface FeedActivity {
	id: string;
	type: string;
	user: { id: string; username: string };
	target: { type: string; id: string } | null;
}

const PREMIUM_ROLES: UserRole[] = ["premium", "moderator", "admin"];

function followUser(follower: Account, target: Account) {
	return UserFollower.create({
		followerId: follower.user.id,
		followingId: target.user.id
	});
}

async function createActivity(
	account: Account,
	type: ActivityType,
	createdAt?: Date
) {
	return Activity.create({ userId: account.user.id, type, createdAt });
}

async function createGameActivity(
	account: Account,
	type: ActivityType = "backlog_added",
	createdAt?: Date
) {
	const game = await createGame();
	const activity = await createActivity(account, type, createdAt);
	await ActivityGame.create({ activityId: activity.id, gameId: game.id });
	return activity;
}

async function createListActivity(
	account: Account,
	type: ActivityType = "list_created"
) {
	const source = await createScoreSource();
	const list = await createList(account.user.id, source.code);
	const activity = await createActivity(account, type);
	await ActivityList.create({ activityId: activity.id, listId: list.id });
	return { activity, list };
}

async function createUserActivity(
	account: Account,
	target: Account,
	type: ActivityType
) {
	const activity = await createActivity(account, type);
	await ActivityUser.create({
		activityId: activity.id,
		targetUserId: target.user.id
	});
	return activity;
}

function requestFeed(account: Account, query: Record<string, unknown> = {}) {
	return api()
		.get("/feed")
		.query(query)
		.set("Authorization", account.authorization);
}

async function getFeed(account: Account, query: Record<string, unknown> = {}) {
	const response = await requestFeed(account, query).expect(200);
	return response.body.data as { activities: FeedActivity[]; total: number };
}

async function getFeedIds(
	account: Account,
	query: Record<string, unknown> = {}
) {
	const { activities } = await getFeed(account, query);
	return activities.map(activity => activity.id);
}

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60 * 1000);
}

void describe("GET /feed", () => {
	void describe("content", () => {
		void it("returns an empty feed for a user with no activity", async () => {
			const viewer = await createUserWithSession();

			const response = await requestFeed(viewer);

			assert.equal(response.status, 200);
			assert.deepEqual(response.body, {
				data: { activities: [], total: 0 }
			});
		});

		void it("includes the activities of the viewer", async () => {
			const viewer = await createUserWithSession();
			const activity = await createGameActivity(viewer);

			const { activities, total } = await getFeed(viewer);

			assert.equal(total, 1);
			assert.equal(activities.length, 1);
			assert.equal(activities[0]!.id, activity.id);
			assert.equal(activities[0]!.type, "backlog_added");
			assert.equal(activities[0]!.user.id, viewer.user.id);
			assert.equal(activities[0]!.user.username, viewer.user.username);
		});

		void it("includes the activities of followed users", async () => {
			const viewer = await createUserWithSession();
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			const activity = await createGameActivity(followed);

			const { activities } = await getFeed(viewer);

			assert.deepEqual(
				activities.map(entry => entry.id),
				[activity.id]
			);
			assert.equal(activities[0]!.user.id, followed.user.id);
		});

		void it("excludes users the viewer does not follow", async () => {
			const viewer = await createUserWithSession();
			const stranger = await createUserWithSession();
			await createGameActivity(stranger);

			assert.deepEqual(await getFeedIds(viewer), []);
		});

		void it("does not show the activities of a user that only follows the viewer", async () => {
			const viewer = await createUserWithSession();
			const follower = await createUserWithSession();
			await followUser(follower, viewer);
			await createGameActivity(follower);

			assert.deepEqual(await getFeedIds(viewer), []);
		});

		void it("orders activities from newest to oldest", async () => {
			const viewer = await createUserWithSession();
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			const oldest = await createGameActivity(
				viewer,
				"backlog_added",
				minutesAgo(30)
			);
			const newest = await createGameActivity(
				followed,
				"backlog_added",
				minutesAgo(5)
			);
			const middle = await createGameActivity(
				viewer,
				"backlog_added",
				minutesAgo(15)
			);

			assert.deepEqual(await getFeedIds(viewer), [
				newest.id,
				middle.id,
				oldest.id
			]);
		});

		void it("serializes a game, a list and a user target", async () => {
			const viewer = await createUserWithSession();
			const buddy = await createUserWithSession();
			const gameActivity = await createGameActivity(viewer);
			const { activity: listActivity, list } =
				await createListActivity(viewer);
			const coopActivity = await createUserActivity(
				viewer,
				buddy,
				"coop_tagged"
			);

			const { activities } = await getFeed(viewer);
			const byId = new Map(activities.map(entry => [entry.id, entry]));

			assert.equal(byId.get(gameActivity.id)!.target?.type, "game");
			assert.equal(byId.get(listActivity.id)!.target?.type, "list");
			assert.equal(byId.get(listActivity.id)!.target?.id, list.id);
			assert.equal(byId.get(coopActivity.id)!.target?.type, "user");
			assert.equal(byId.get(coopActivity.id)!.target?.id, buddy.user.id);
		});

		void it("never returns follow events", async () => {
			const viewer = await createUserWithSession();
			const other = await createUserWithSession();
			await createUserActivity(viewer, other, "user_followed");
			await createUserActivity(viewer, other, "user_followed_by");
			const kept = await createGameActivity(viewer);

			const { activities, total } = await getFeed(viewer);

			assert.deepEqual(
				activities.map(entry => entry.id),
				[kept.id]
			);
			assert.equal(total, 1);
		});
	});

	void describe("privacy", () => {
		void it("shows the viewer their own activities whatever their own visibility", async () => {
			const viewer = await createUserWithSession();
			await viewer.user.update({
				profileVisibility: "private",
				feedVisibility: "private"
			});
			const activity = await createGameActivity(viewer);

			assert.deepEqual(await getFeedIds(viewer), [activity.id]);
		});

		for (const feedVisibility of ["private", "friends"] as const) {
			void it(`hides the activities of a followed user with ${feedVisibility} feed visibility`, async () => {
				const viewer = await createUserWithSession();
				const followed = await createUserWithSession();
				await followUser(viewer, followed);
				await followed.user.update({ feedVisibility });
				await createGameActivity(followed);

				const { activities, total } = await getFeed(viewer);

				assert.deepEqual(activities, []);
				assert.equal(total, 0);
			});
		}

		void it("hides the activities of a followed user with a private profile", async () => {
			const viewer = await createUserWithSession();
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			await followed.user.update({ profileVisibility: "private" });
			await createGameActivity(followed);

			assert.deepEqual(await getFeedIds(viewer), []);
		});

		void it("hides the activities of a followed user with a friends-only profile", async () => {
			const viewer = await createUserWithSession();
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			await followed.user.update({ profileVisibility: "friends" });
			await createGameActivity(followed);

			assert.deepEqual(await getFeedIds(viewer), []);
		});

		void it("shows the activities of a mutual follower with friends feed visibility", async () => {
			const viewer = await createUserWithSession();
			const friend = await createUserWithSession();
			await followUser(viewer, friend);
			await followUser(friend, viewer);
			await friend.user.update({ feedVisibility: "friends" });
			const activity = await createGameActivity(friend);

			const { activities, total } = await getFeed(viewer);

			assert.deepEqual(
				activities.map(entry => entry.id),
				[activity.id]
			);
			assert.equal(total, 1);
		});

		void it("shows the activities of a mutual follower with a friends profile", async () => {
			const viewer = await createUserWithSession();
			const friend = await createUserWithSession();
			await followUser(viewer, friend);
			await followUser(friend, viewer);
			await friend.user.update({ profileVisibility: "friends" });
			const activity = await createGameActivity(friend);

			assert.deepEqual(await getFeedIds(viewer), [activity.id]);
		});

		void it("shows the activities of a mutual follower with friends profile and feed", async () => {
			const viewer = await createUserWithSession();
			const friend = await createUserWithSession();
			await followUser(viewer, friend);
			await followUser(friend, viewer);
			await friend.user.update({
				profileVisibility: "friends",
				feedVisibility: "friends"
			});
			const activity = await createGameActivity(friend);

			assert.deepEqual(await getFeedIds(viewer), [activity.id]);
		});

		for (const hidden of [
			{ profileVisibility: "private" },
			{ feedVisibility: "private" },
			{ profileVisibility: "private", feedVisibility: "friends" },
			{ profileVisibility: "friends", feedVisibility: "private" }
		] as const) {
			void it(`hides a mutual follower's activities with ${JSON.stringify(hidden)}`, async () => {
				const viewer = await createUserWithSession();
				const friend = await createUserWithSession();
				await followUser(viewer, friend);
				await followUser(friend, viewer);
				await friend.user.update(hidden);
				await createGameActivity(friend);

				const { activities, total } = await getFeed(viewer);

				assert.deepEqual(activities, []);
				assert.equal(total, 0);
			});
		}

		void it("keeps hiding friends-only activities from a one-way follower", async () => {
			const viewer = await createUserWithSession();
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			await followed.user.update({
				profileVisibility: "friends",
				feedVisibility: "friends"
			});
			await createGameActivity(followed);

			assert.deepEqual(await getFeedIds(viewer), []);
		});

		void it("does not leak friends-only activities to the other direction of the follow", async () => {
			const viewer = await createUserWithSession();
			const friend = await createUserWithSession();
			await followUser(viewer, friend);
			await followUser(friend, viewer);
			await viewer.user.update({ feedVisibility: "friends" });
			const outsider = await createUserWithSession();
			await followUser(outsider, viewer);
			await createGameActivity(viewer);

			assert.deepEqual(await getFeedIds(outsider), []);
		});

		void it("paginates friends-only activities with a correct total", async () => {
			const viewer = await createUserWithSession();
			const friend = await createUserWithSession();
			const hidden = await createUserWithSession();
			await followUser(viewer, friend);
			await followUser(friend, viewer);
			await followUser(viewer, hidden);
			await friend.user.update({ feedVisibility: "friends" });
			const older = await createGameActivity(
				friend,
				"backlog_added",
				minutesAgo(3)
			);
			const newer = await createGameActivity(
				friend,
				"backlog_added",
				minutesAgo(1)
			);
			await createGameActivity(hidden);
			await hidden.user.update({ feedVisibility: "friends" });

			const firstPage = await getFeed(viewer, { limit: 1 });
			const secondPage = await getFeed(viewer, { limit: 1, offset: 1 });

			assert.deepEqual(
				firstPage.activities.map(entry => entry.id),
				[newer.id]
			);
			assert.deepEqual(
				secondPage.activities.map(entry => entry.id),
				[older.id]
			);
			assert.equal(firstPage.total, 2);
			assert.equal(secondPage.total, 2);
		});

		void it("keeps visible and hidden authors apart in the same feed and total", async () => {
			const viewer = await createUserWithSession();
			const visible = await createUserWithSession();
			const hidden = await createUserWithSession();
			await followUser(viewer, visible);
			await followUser(viewer, hidden);
			await hidden.user.update({ feedVisibility: "private" });
			const visibleActivity = await createGameActivity(visible);
			await createGameActivity(hidden);
			const ownActivity = await createGameActivity(viewer);

			const { activities, total } = await getFeed(viewer);

			assert.deepEqual(
				new Set(activities.map(entry => entry.id)),
				new Set([visibleActivity.id, ownActivity.id])
			);
			assert.equal(total, 2);
		});

		void it("applies the same visibility rules when the feed is filtered", async () => {
			const viewer = await createUserWithSession("premium");
			const visible = await createUserWithSession();
			const hidden = await createUserWithSession();
			await followUser(viewer, visible);
			await followUser(viewer, hidden);
			await hidden.user.update({ feedVisibility: "private" });
			const visibleActivity = await createGameActivity(visible);
			await createGameActivity(hidden);

			assert.deepEqual(await getFeedIds(viewer, { category: "games" }), [
				visibleActivity.id
			]);
			assert.deepEqual(
				await getFeedIds(viewer, { types: "backlog_added" }),
				[visibleActivity.id]
			);
		});

		void it("stops showing a user once the viewer unfollows them", async () => {
			const viewer = await createUserWithSession();
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			const activity = await createGameActivity(followed);
			assert.deepEqual(await getFeedIds(viewer), [activity.id]);

			await UserFollower.destroy({
				where: {
					followerId: viewer.user.id,
					followingId: followed.user.id
				}
			});

			assert.deepEqual(await getFeedIds(viewer), []);
		});
	});

	void describe("premium gate", () => {
		void it("lets a free user read the unfiltered feed", async () => {
			const viewer = await createUserWithSession("user");
			const activity = await createGameActivity(viewer);

			assert.deepEqual(await getFeedIds(viewer), [activity.id]);
		});

		void it("lets a free user paginate the unfiltered feed", async () => {
			const viewer = await createUserWithSession("user");
			await createGameActivity(viewer);

			const response = await requestFeed(viewer, {
				limit: 5,
				offset: 0
			});

			assert.equal(response.status, 200);
		});

		void it("answers 402 ACTIVITY_FEED_FILTER_PREMIUM to a free user filtering by category", async () => {
			const viewer = await createUserWithSession("user");
			await createGameActivity(viewer);

			const response = await requestFeed(viewer, { category: "games" });

			assert.equal(response.status, 402);
			assert.equal(response.body.type, "ACTIVITY_FEED_FILTER_PREMIUM");
			assert.equal(response.body.status, 402);
			assert.equal(response.body.instance, "/feed?category=games");
		});

		void it("answers 402 ACTIVITY_FEED_FILTER_PREMIUM to a free user filtering by types", async () => {
			const viewer = await createUserWithSession("user");
			await createGameActivity(viewer);

			const response = await requestFeed(viewer, {
				types: "backlog_added"
			});

			assert.equal(response.status, 402);
			assert.equal(response.body.type, "ACTIVITY_FEED_FILTER_PREMIUM");
		});

		void it("answers 402 to a free user combining category and types", async () => {
			const viewer = await createUserWithSession("user");

			const response = await requestFeed(viewer, {
				category: "games",
				types: "backlog_added"
			});

			assert.equal(response.status, 402);
			assert.equal(response.body.type, "ACTIVITY_FEED_FILTER_PREMIUM");
		});

		void it("answers 402 to a free user filtering and paginating at once", async () => {
			const viewer = await createUserWithSession("user");

			const response = await requestFeed(viewer, {
				category: "lists",
				limit: 10,
				offset: 0
			});

			assert.equal(response.status, 402);
		});

		void it("validates the query before applying the gate", async () => {
			const viewer = await createUserWithSession("user");

			const response = await requestFeed(viewer, {
				category: "nonexistent"
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});

		for (const role of PREMIUM_ROLES) {
			void it(`lets a ${role} filter by category`, async () => {
				const viewer = await createUserWithSession(role);
				const gameActivity = await createGameActivity(viewer);
				await createListActivity(viewer);

				assert.deepEqual(
					await getFeedIds(viewer, { category: "games" }),
					[gameActivity.id]
				);
			});

			void it(`lets a ${role} filter by types`, async () => {
				const viewer = await createUserWithSession(role);
				const completed = await createGameActivity(
					viewer,
					"backlog_completed"
				);
				await createGameActivity(viewer, "backlog_playing");

				assert.deepEqual(
					await getFeedIds(viewer, { types: "backlog_completed" }),
					[completed.id]
				);
			});
		}
	});

	void describe("category filter", () => {
		void it("returns only game activities for games", async () => {
			const viewer = await createUserWithSession("premium");
			const buddy = await createUserWithSession();
			const gameTypes: ActivityType[] = [
				"backlog_added",
				"backlog_completed",
				"queue_added",
				"wishlist_added",
				"shelf_added",
				"favorite_added",
				"game_reviewed"
			];
			const gameActivities = await Promise.all(
				gameTypes.map(type => createGameActivity(viewer, type))
			);
			await createListActivity(viewer);
			await createUserActivity(viewer, buddy, "coop_tagged");

			const { activities, total } = await getFeed(viewer, {
				category: "games"
			});

			assert.deepEqual(
				new Set(activities.map(entry => entry.id)),
				new Set(gameActivities.map(entry => entry.id))
			);
			assert.equal(total, gameTypes.length);
		});

		void it("returns only list activities for lists", async () => {
			const viewer = await createUserWithSession("premium");
			const { activity: created } = await createListActivity(
				viewer,
				"list_created"
			);
			const { activity: followed } = await createListActivity(
				viewer,
				"list_followed"
			);
			await createGameActivity(viewer);

			const { activities, total } = await getFeed(viewer, {
				category: "lists"
			});

			assert.deepEqual(
				new Set(activities.map(entry => entry.id)),
				new Set([created.id, followed.id])
			);
			assert.equal(total, 2);
		});

		void it("returns only the non-follow social events for social", async () => {
			const viewer = await createUserWithSession("premium");
			const buddy = await createUserWithSession();
			const coop = await createUserActivity(viewer, buddy, "coop_tagged");
			await createUserActivity(viewer, buddy, "user_followed");
			await createUserActivity(viewer, buddy, "user_followed_by");
			await createGameActivity(viewer);

			const { activities, total } = await getFeed(viewer, {
				category: "social"
			});

			assert.deepEqual(
				activities.map(entry => entry.id),
				[coop.id]
			);
			assert.equal(total, 1);
		});

		void it("returns an empty page when the category has no activities", async () => {
			const viewer = await createUserWithSession("premium");
			await createGameActivity(viewer);

			const { activities, total } = await getFeed(viewer, {
				category: "lists"
			});

			assert.deepEqual(activities, []);
			assert.equal(total, 0);
		});

		void it("filters the activities of followed users too", async () => {
			const viewer = await createUserWithSession("premium");
			const followed = await createUserWithSession();
			await followUser(viewer, followed);
			const gameActivity = await createGameActivity(followed);
			await createListActivity(followed);

			assert.deepEqual(await getFeedIds(viewer, { category: "games" }), [
				gameActivity.id
			]);
		});

		void it("rejects an unknown category with 422", async () => {
			const viewer = await createUserWithSession("premium");

			const response = await requestFeed(viewer, { category: "music" });

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	});

	void describe("types filter", () => {
		void it("returns only the requested type", async () => {
			const viewer = await createUserWithSession("premium");
			const completed = await createGameActivity(
				viewer,
				"backlog_completed"
			);
			await createGameActivity(viewer, "backlog_abandoned");
			await createGameActivity(viewer, "wishlist_added");

			const { activities, total } = await getFeed(viewer, {
				types: "backlog_completed"
			});

			assert.deepEqual(
				activities.map(entry => entry.id),
				[completed.id]
			);
			assert.equal(total, 1);
		});

		void it("accepts a comma separated list of types", async () => {
			const viewer = await createUserWithSession("premium");
			const completed = await createGameActivity(
				viewer,
				"backlog_completed"
			);
			const reviewed = await createGameActivity(viewer, "game_reviewed");
			const { activity: listCreated } = await createListActivity(
				viewer,
				"list_created"
			);
			await createGameActivity(viewer, "backlog_abandoned");

			const { activities, total } = await getFeed(viewer, {
				types: "backlog_completed,game_reviewed,list_created"
			});

			assert.deepEqual(
				new Set(activities.map(entry => entry.id)),
				new Set([completed.id, reviewed.id, listCreated.id])
			);
			assert.equal(total, 3);
		});

		void it("returns nothing when only follow events are requested", async () => {
			const viewer = await createUserWithSession("premium");
			const other = await createUserWithSession();
			await createUserActivity(viewer, other, "user_followed");
			await createUserActivity(viewer, other, "user_followed_by");

			const { activities, total } = await getFeed(viewer, {
				types: "user_followed,user_followed_by"
			});

			assert.deepEqual(activities, []);
			assert.equal(total, 0);
		});

		void it("rejects an unknown type with 422", async () => {
			const viewer = await createUserWithSession("premium");

			const response = await requestFeed(viewer, {
				types: "backlog_completed,not_a_type"
			});

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});

		void it("rejects an empty types value with 422", async () => {
			const viewer = await createUserWithSession("premium");

			const response = await requestFeed(viewer, { types: "" });

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});

		void it("rejects a types list with an empty item with 422", async () => {
			const viewer = await createUserWithSession("premium");

			const response = await requestFeed(viewer, {
				types: "backlog_completed,"
			});

			assert.equal(response.status, 422);
		});
	});

	void describe("category and types combined", () => {
		void it("returns the intersection of both filters", async () => {
			const viewer = await createUserWithSession("premium");
			const completed = await createGameActivity(
				viewer,
				"backlog_completed"
			);
			await createGameActivity(viewer, "backlog_abandoned");
			await createListActivity(viewer, "list_created");

			const { activities, total } = await getFeed(viewer, {
				category: "games",
				types: "backlog_completed,list_created"
			});

			assert.deepEqual(
				activities.map(entry => entry.id),
				[completed.id]
			);
			assert.equal(total, 1);
		});

		void it("returns nothing when the types fall outside the category", async () => {
			const viewer = await createUserWithSession("premium");
			await createGameActivity(viewer, "backlog_completed");
			await createListActivity(viewer, "list_created");

			const { activities, total } = await getFeed(viewer, {
				category: "games",
				types: "list_created"
			});

			assert.deepEqual(activities, []);
			assert.equal(total, 0);
		});

		void it("narrows the category to the requested types", async () => {
			const viewer = await createUserWithSession("premium");
			const created = await createListActivity(viewer, "list_created");
			await createListActivity(viewer, "list_followed");

			assert.deepEqual(
				await getFeedIds(viewer, {
					category: "lists",
					types: "list_created"
				}),
				[created.activity.id]
			);
		});
	});

	void describe("pagination", () => {
		async function seedOrderedActivities(account: Account, count: number) {
			const activities: Activity[] = [];
			for (let index = 0; index < count; index += 1) {
				activities.push(
					await createGameActivity(
						account,
						"backlog_added",
						minutesAgo(count - index)
					)
				);
			}
			return activities.reverse();
		}

		void it("returns at most limit activities and the full total", async () => {
			const viewer = await createUserWithSession();
			const ordered = await seedOrderedActivities(viewer, 5);

			const { activities, total } = await getFeed(viewer, { limit: 2 });

			assert.deepEqual(
				activities.map(entry => entry.id),
				ordered.slice(0, 2).map(entry => entry.id)
			);
			assert.equal(total, 5);
		});

		void it("skips offset activities", async () => {
			const viewer = await createUserWithSession();
			const ordered = await seedOrderedActivities(viewer, 5);

			const { activities, total } = await getFeed(viewer, {
				limit: 2,
				offset: 2
			});

			assert.deepEqual(
				activities.map(entry => entry.id),
				ordered.slice(2, 4).map(entry => entry.id)
			);
			assert.equal(total, 5);
		});

		void it("returns a short last page", async () => {
			const viewer = await createUserWithSession();
			const ordered = await seedOrderedActivities(viewer, 5);

			const { activities, total } = await getFeed(viewer, {
				limit: 2,
				offset: 4
			});

			assert.deepEqual(
				activities.map(entry => entry.id),
				[ordered[4]!.id]
			);
			assert.equal(total, 5);
		});

		void it("returns an empty page past the end but keeps the total", async () => {
			const viewer = await createUserWithSession();
			await seedOrderedActivities(viewer, 3);

			const { activities, total } = await getFeed(viewer, {
				offset: 10
			});

			assert.deepEqual(activities, []);
			assert.equal(total, 3);
		});

		void it("walks every activity once across consecutive pages", async () => {
			const viewer = await createUserWithSession();
			const ordered = await seedOrderedActivities(viewer, 5);

			const seen: string[] = [];
			for (const offset of [0, 2, 4]) {
				seen.push(...(await getFeedIds(viewer, { limit: 2, offset })));
			}

			assert.deepEqual(
				seen,
				ordered.map(entry => entry.id)
			);
		});

		void it("defaults to 25 activities per page", async () => {
			const viewer = await createUserWithSession();
			await Activity.bulkCreate(
				Array.from({ length: 27 }, () => ({
					userId: viewer.user.id,
					type: "backlog_added"
				}))
			);

			const { activities, total } = await getFeed(viewer);

			assert.equal(activities.length, 25);
			assert.equal(total, 27);
		});

		void it("accepts the minimum and maximum limit", async () => {
			const viewer = await createUserWithSession();
			await createGameActivity(viewer);

			assert.equal((await getFeed(viewer, { limit: 1 })).total, 1);
			assert.equal((await getFeed(viewer, { limit: 100 })).total, 1);
		});

		void it("paginates a filtered feed", async () => {
			const viewer = await createUserWithSession("premium");
			const first = await createGameActivity(
				viewer,
				"backlog_completed",
				minutesAgo(3)
			);
			const second = await createGameActivity(
				viewer,
				"backlog_completed",
				minutesAgo(2)
			);
			await createGameActivity(viewer, "backlog_playing");

			const { activities, total } = await getFeed(viewer, {
				types: "backlog_completed",
				limit: 1,
				offset: 1
			});

			assert.deepEqual(
				activities.map(entry => entry.id),
				[first.id]
			);
			assert.equal(total, 2);
			assert.notEqual(first.id, second.id);
		});
	});

	void describe("validation", () => {
		const invalidQueries: [string, Record<string, unknown>][] = [
			["limit 0", { limit: 0 }],
			["limit above 100", { limit: 101 }],
			["a negative limit", { limit: -1 }],
			["a fractional limit", { limit: 1.5 }],
			["a non numeric limit", { limit: "many" }],
			["a negative offset", { offset: -1 }],
			["a fractional offset", { offset: 0.5 }],
			["a non numeric offset", { offset: "first" }]
		];

		for (const [name, query] of invalidQueries) {
			void it(`rejects ${name} with 422 COMMON_SCHEMA_INVALID`, async () => {
				const viewer = await createUserWithSession();

				const response = await requestFeed(viewer, query);

				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			});
		}
	});

	void describe("authentication", () => {
		void it("rejects a request without credentials", async () => {
			const response = await api().get("/feed");

			assert.equal(response.status, 422);
		});

		void it("rejects an invalid token with 401", async () => {
			const response = await api()
				.get("/feed")
				.set("Authorization", "Bearer invalid-token");

			assert.equal(response.status, 401);
		});
	});
});
