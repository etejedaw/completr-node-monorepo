import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ListFollower } from "../../src/list-followers/list-follower.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic" });
});

const NON_EXISTENT_LIST_ID = "00000000-0000-4000-8000-000000000000";

function follow(listId: string, authorization: string) {
	return api()
		.post(`/lists/${listId}/follow`)
		.set("Authorization", authorization);
}

void describe("POST /lists/:listId/follow privacy", () => {
	void it("answers a private list of someone else exactly like a missing list", async () => {
		const owner = await createUserWithSession();
		const stranger = await createUserWithSession();
		const list = await createList(owner.user.id, "metacritic", {
			isPublic: false
		});

		const privateResponse = await follow(list.id, stranger.authorization);
		const missingResponse = await follow(
			NON_EXISTENT_LIST_ID,
			stranger.authorization
		);

		assert.equal(privateResponse.status, 404);
		assert.equal(privateResponse.body.type, "LIST_FOLLOWER_LIST_NOT_FOUND");
		assert.equal(privateResponse.status, missingResponse.status);
		assert.equal(privateResponse.body.type, missingResponse.body.type);
		assert.equal(
			await ListFollower.count({ where: { userId: stranger.user.id } }),
			0
		);
	});

	void it("keeps LIST_FOLLOWER_NOT_PUBLIC for the owner of the private list", async () => {
		const owner = await createUserWithSession();
		const list = await createList(owner.user.id, "metacritic", {
			isPublic: false
		});

		const response = await follow(list.id, owner.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "LIST_FOLLOWER_NOT_PUBLIC");
	});

	void it("answers a double click on a public list with one 201 and one 409", async () => {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		const list = await createList(owner.user.id, "metacritic", {
			isPublic: true
		});

		const responses = await Promise.all([
			follow(list.id, follower.authorization),
			follow(list.id, follower.authorization)
		]);

		assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
		assert.equal(
			await ListFollower.count({ where: { userId: follower.user.id } }),
			1
		);
	});

	void it("lists followers without exposing more than the public user fields", async () => {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		const list = await createList(owner.user.id, "metacritic", {
			isPublic: true
		});
		await ListFollower.create({ listId: list.id, userId: follower.user.id });

		const response = await api()
			.get(`/lists/${list.id}/followers`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(Object.keys(response.body.data.users[0]).sort(), [
			"avatarUrl",
			"id",
			"name",
			"role",
			"username"
		]);
	});
});
