import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import { ActivityList } from "../../src/activity/targets/activity-list.model";
import { List } from "../../src/lists/list.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { api } from "../helpers/app.helper";
import { type Account, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

useTestDatabase();

async function createListCreatedActivity(owner: Account, isPublic: boolean) {
	const source = await createScoreSource();
	const list = await createList(owner.user.id, source.code, { isPublic });
	const activity = await Activity.create({
		userId: owner.user.id,
		type: "list_created"
	});
	await ActivityList.create({ activityId: activity.id, listId: list.id });
	return { activity, list };
}

async function feedActivityIds(viewer: Account) {
	const response = await api()
		.get("/feed")
		.set("Authorization", viewer.authorization)
		.expect(200);
	return (response.body.data.activities as { id: string }[]).map(
		activity => activity.id
	);
}

async function profileActivityIds(viewer: Account, owner: Account) {
	const response = await api()
		.get(`/users/${owner.user.username}`)
		.set("Authorization", viewer.authorization)
		.expect(200);
	return (response.body.data.recentActivity as { id: string }[]).map(
		activity => activity.id
	);
}

async function followerOf(owner: Account) {
	const viewer = await createUserWithSession();
	await UserFollower.create({
		followerId: viewer.user.id,
		followingId: owner.user.id
	});
	return viewer;
}

void describe("activities that point at a list that is no longer public", () => {
	void it("hides them from the feed of followers and shows them again once the list is public", async () => {
		const owner = await createUserWithSession();
		const viewer = await followerOf(owner);
		const { activity, list } = await createListCreatedActivity(owner, true);
		assert.ok((await feedActivityIds(viewer)).includes(activity.id));

		await List.update({ isPublic: false }, { where: { id: list.id } });
		assert.equal(
			(await feedActivityIds(viewer)).includes(activity.id),
			false
		);

		await List.update({ isPublic: true }, { where: { id: list.id } });
		assert.ok((await feedActivityIds(viewer)).includes(activity.id));
	});

	void it("hides them from the recent activity of the profile for everyone but the owner", async () => {
		const owner = await createUserWithSession();
		const viewer = await followerOf(owner);
		const { activity } = await createListCreatedActivity(owner, false);

		assert.equal(
			(await profileActivityIds(viewer, owner)).includes(activity.id),
			false
		);
		assert.ok(
			(await profileActivityIds(owner, owner)).includes(activity.id)
		);
	});

	void it("keeps the owner's own feed showing their private list activity", async () => {
		const owner = await createUserWithSession();
		const { activity } = await createListCreatedActivity(owner, false);

		assert.ok((await feedActivityIds(owner)).includes(activity.id));
	});
});

void describe("DELETE /feed/:activityId", () => {
	void it("answers a Problem Details 404 for an activity that is not yours or does not exist", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUserWithSession();
		const activity = await Activity.create({
			userId: owner.user.id,
			type: "backlog_added"
		});

		const foreign = await api()
			.delete(`/feed/${activity.id}`)
			.set("Authorization", stranger.authorization);
		const missing = await api()
			.delete("/feed/00000000-0000-4000-8000-000000000000")
			.set("Authorization", owner.authorization);

		for (const response of [foreign, missing]) {
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "ACTIVITY_NOT_FOUND");
		}
	});
});
