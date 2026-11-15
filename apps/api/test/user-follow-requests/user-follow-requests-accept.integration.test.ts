import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import { UserFollowRequest } from "../../src/user-follow-requests/user-follow-request.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";

useTestDatabase();

const CONCURRENT_ACCEPTS = 4;

void describe("POST /users/me/follow-requests/:requesterId/accept under concurrency", () => {
	void it("creates one follow and one pair of activities on a double click", async () => {
		const target = await createUserWithSession();
		await User.update(
			{ profileVisibility: "private" },
			{ where: { id: target.user.id } }
		);
		const requester = await createUserWithSession();
		await api()
			.post(`/users/${target.user.username}/follow`)
			.set("Authorization", requester.authorization)
			.expect(201);

		const responses = await Promise.all(
			Array.from({ length: CONCURRENT_ACCEPTS }, () =>
				api()
					.post(
						`/users/me/follow-requests/${requester.user.id}/accept`
					)
					.set("Authorization", target.authorization)
			)
		);

		assert.equal(
			responses.filter(response => response.status === 204).length,
			1
		);
		for (const response of responses.filter(
			response => response.status !== 204
		))
			assert.equal(response.body.type, "USER_FOLLOW_REQUEST_NOT_FOUND");
		assert.equal(
			await UserFollower.count({
				where: {
					followerId: requester.user.id,
					followingId: target.user.id
				}
			}),
			1
		);
		assert.equal(
			await UserFollowRequest.count({
				where: { targetId: target.user.id }
			}),
			0
		);
		await eventually(async () => {
			const activities = await Activity.count({
				where: { userId: [requester.user.id, target.user.id] }
			});
			assert.equal(activities, 2);
		});
	});

	void it("answers 404 for a request id that never existed", async () => {
		const target = await createUserWithSession();

		const response = await api()
			.post(
				"/users/me/follow-requests/00000000-0000-4000-8000-000000000000/accept"
			)
			.set("Authorization", target.authorization);

		assert.equal(response.status, 404);
	});
});
