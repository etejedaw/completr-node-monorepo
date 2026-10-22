import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity, type ActivityType } from "../../src/activity/activity.model";
import { ActivityGame } from "../../src/activity/targets/activity-game.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

const NON_EXISTENT_ID = "00000000-0000-4000-8000-000000000000";

interface FeedActivity {
	id: string;
	type: string;
	user: { username: string };
	target: { id: string; name: string } | null;
}

async function createGameActivity(
	account: Account,
	type: ActivityType = "backlog_added"
) {
	const game = await createGame();
	const activity = await Activity.create({ userId: account.user.id, type });
	await ActivityGame.create({ activityId: activity.id, gameId: game.id });
	return { activity, game };
}

function followUser(follower: Account, target: Account) {
	return UserFollower.create({
		followerId: follower.user.id,
		followingId: target.user.id
	});
}

function deleteActivity(account: Account, activityId: string) {
	return api()
		.delete(`/feed/${activityId}`)
		.set("Authorization", account.authorization);
}

async function getFeed(account: Account) {
	const response = await api()
		.get("/feed")
		.set("Authorization", account.authorization)
		.expect(200);
	return response.body.data.activities as FeedActivity[];
}

function feedIds(activities: FeedActivity[]) {
	return activities.map(activity => activity.id);
}

void describe("DELETE /feed/:activityId", () => {
	void it("deletes an own activity with 204 and no body", async () => {
		const owner = await createUserWithSession();
		const { activity } = await createGameActivity(owner);

		const response = await deleteActivity(owner, activity.id);

		assert.equal(response.status, 204);
		assert.deepEqual(response.body, {});
		assert.equal(await Activity.findByPk(activity.id), null);
	});

	void it("removes the activity from the own feed", async () => {
		const owner = await createUserWithSession();
		const { activity: removed } = await createGameActivity(owner);
		const { activity: kept } = await createGameActivity(owner);
		assert.deepEqual(
			new Set(feedIds(await getFeed(owner))),
			new Set([removed.id, kept.id])
		);

		await deleteActivity(owner, removed.id).expect(204);

		assert.deepEqual(feedIds(await getFeed(owner)), [kept.id]);
	});

	void it("removes the activity target along with it", async () => {
		const owner = await createUserWithSession();
		const { activity } = await createGameActivity(owner);

		await deleteActivity(owner, activity.id).expect(204);

		const orphanTargets = await ActivityGame.count({
			where: { activityId: activity.id }
		});
		assert.equal(orphanTargets, 0);
	});

	void it("removes the activity from the feed of a follower", async () => {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		await followUser(follower, owner);
		const { activity } = await createGameActivity(owner);
		assert.deepEqual(feedIds(await getFeed(follower)), [activity.id]);

		await deleteActivity(owner, activity.id).expect(204);

		assert.deepEqual(await getFeed(follower), []);
	});

	void it("returns 404 when the activity was already deleted", async () => {
		const owner = await createUserWithSession();
		const { activity } = await createGameActivity(owner);
		await deleteActivity(owner, activity.id).expect(204);

		const response = await deleteActivity(owner, activity.id);

		assert.equal(response.status, 404);
	});

	void it("returns 404 for an activity that does not exist", async () => {
		const owner = await createUserWithSession();

		const response = await deleteActivity(owner, NON_EXISTENT_ID);

		assert.equal(response.status, 404);
	});

	void it("does not delete the activity of another user", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const { activity } = await createGameActivity(owner);

		const response = await deleteActivity(intruder, activity.id);

		assert.equal(response.status, 404);
		assert.ok(await Activity.findByPk(activity.id));
		assert.deepEqual(feedIds(await getFeed(owner)), [activity.id]);
	});

	void it("answers a foreign activity the same way as a missing one", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const { activity } = await createGameActivity(owner);

		const foreignResponse = await deleteActivity(intruder, activity.id);
		const missingResponse = await deleteActivity(intruder, NON_EXISTENT_ID);

		assert.equal(foreignResponse.status, missingResponse.status);
		assert.deepEqual(foreignResponse.body, missingResponse.body);
	});

	void it("does not let a follower delete the activity they see in their feed", async () => {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		await followUser(follower, owner);
		const { activity } = await createGameActivity(owner);
		assert.deepEqual(feedIds(await getFeed(follower)), [activity.id]);

		const response = await deleteActivity(follower, activity.id);

		assert.equal(response.status, 404);
		assert.deepEqual(feedIds(await getFeed(follower)), [activity.id]);
		assert.deepEqual(feedIds(await getFeed(owner)), [activity.id]);
	});

	void it("keeps the activities of other users when deleting an own one", async () => {
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		await followUser(owner, other);
		const { activity: ownActivity } = await createGameActivity(owner);
		const { activity: otherActivity } = await createGameActivity(other);

		await deleteActivity(owner, ownActivity.id).expect(204);

		assert.deepEqual(feedIds(await getFeed(owner)), [otherActivity.id]);
		assert.deepEqual(feedIds(await getFeed(other)), [otherActivity.id]);
	});

	void it("rejects an activityId that is not a UUID with 422", async () => {
		const owner = await createUserWithSession();

		const response = await deleteActivity(owner, "not-a-uuid");

		assert.equal(response.status, 422);
	});

	void it("rejects a request without credentials", async () => {
		const owner = await createUserWithSession();
		const { activity } = await createGameActivity(owner);

		const response = await api().delete(`/feed/${activity.id}`);

		assert.equal(response.status, 422);
		assert.ok(await Activity.findByPk(activity.id));
	});

	void it("rejects an invalid token with 401", async () => {
		const owner = await createUserWithSession();
		const { activity } = await createGameActivity(owner);

		const response = await api()
			.delete(`/feed/${activity.id}`)
			.set("Authorization", "Bearer invalid-token");

		assert.equal(response.status, 401);
		assert.ok(await Activity.findByPk(activity.id));
	});
});
