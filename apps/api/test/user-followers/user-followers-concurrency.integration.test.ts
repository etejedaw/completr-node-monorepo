import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UserFollower } from "../../src/user-followers/user-follower.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

const PARALLEL_FOLLOWS = 6;

useTestDatabase();

void describe("POST /users/:username/follow under concurrency", () => {
	void it("follows once and answers 409 to the rest instead of 500 on a double click", async () => {
		const follower = await createUserWithSession();
		const target = await createUserWithSession();

		const responses = await Promise.all(
			Array.from({ length: PARALLEL_FOLLOWS }, () =>
				api()
					.post(`/users/${target.user.username}/follow`)
					.set("Authorization", follower.authorization)
			)
		);

		assert.equal(
			responses.filter(response => response.status === 201).length,
			1
		);
		for (const response of responses.filter(
			response => response.status !== 201
		)) {
			assert.equal(response.status, 409);
			assert.match(
				response.body.type,
				/^USER_(FOLLOWER|FOLLOW_REQUEST)_ALREADY_FOLLOWING$/
			);
		}
		assert.equal(
			await UserFollower.count({
				where: {
					followerId: follower.user.id,
					followingId: target.user.id
				}
			}),
			1
		);
	});
});
