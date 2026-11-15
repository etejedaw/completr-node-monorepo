import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import { ActivityGame } from "../../src/activity/targets/activity-game.model";
import { createUserWithSession } from "../helpers/auth.helper";
import { postBulk } from "../helpers/bulk.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createGame } from "../helpers/factories.helper";

useTestDatabase();

async function createGameIds(count: number) {
	const ids = [];
	for (let index = 0; index < count; index++)
		ids.push((await createGame()).id);
	return ids;
}

void describe("bulk additions record their activity in one batch", () => {
	void it("records one activity per game, in the order requested, each with its game target", async () => {
		const user = await createUserWithSession("user");
		const gameIds = await createGameIds(6);

		await postBulk("/users/me/favorites/bulk", user.authorization, "add", {
			gameIds
		}).expect(200);

		await eventually(async () => {
			assert.equal(
				await Activity.count({
					where: { userId: user.user.id, type: "favorite_added" }
				}),
				gameIds.length
			);
		});
		const activities = await Activity.findAll({
			where: { userId: user.user.id, type: "favorite_added" },
			order: [
				["createdAt", "ASC"],
				["id", "ASC"]
			]
		});
		const targets = await ActivityGame.findAll({
			where: { activityId: activities.map(activity => activity.id) }
		});
		const gameByActivity = new Map(
			targets.map(target => [target.activityId, target.gameId])
		);
		assert.deepEqual(
			activities.map(activity => gameByActivity.get(activity.id)),
			gameIds
		);
	});

	void it("records each game once when the same request is repeated", async () => {
		const user = await createUserWithSession("user");
		const gameIds = await createGameIds(3);

		await postBulk("/users/me/favorites/bulk", user.authorization, "add", {
			gameIds
		}).expect(200);
		await postBulk("/users/me/favorites/bulk", user.authorization, "add", {
			gameIds
		}).expect(200);

		await eventually(async () => {
			assert.equal(
				await Activity.count({
					where: { userId: user.user.id, type: "favorite_added" }
				}),
				gameIds.length
			);
		});
	});

	void it("survives parallel bulk additions from the same user", async () => {
		const user = await createUserWithSession("user");
		const firstIds = await createGameIds(4);
		const secondIds = await createGameIds(4);

		const responses = await Promise.all([
			postBulk("/users/me/favorites/bulk", user.authorization, "add", {
				gameIds: firstIds
			}),
			postBulk("/users/me/favorites/bulk", user.authorization, "add", {
				gameIds: secondIds
			})
		]);

		for (const response of responses) assert.equal(response.status, 200);
		await eventually(async () => {
			assert.equal(
				await Activity.count({
					where: { userId: user.user.id, type: "favorite_added" }
				}),
				8
			);
		});
	});
});
