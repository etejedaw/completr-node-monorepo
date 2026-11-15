import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { List } from "../../src/lists/list.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

const FREE_LIST_LIMIT = 5;
const SIMULTANEOUS_REQUESTS = 6;

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic" });
});

function postList(authorization: string, name: string) {
	return api()
		.post("/lists")
		.set("Authorization", authorization)
		.send({
			name,
			isPublic: false,
			scoreSource: "metacritic",
			durationSource: "hltb"
		});
}

void describe("list creation under concurrent requests", () => {
	void it("never exceeds the free limit when several creates race for the last slots", async () => {
		const owner = await createUserWithSession();
		for (let index = 0; index < FREE_LIST_LIMIT - 2; index++)
			await createList(owner.user.id, "metacritic");

		const responses = await Promise.all(
			Array.from({ length: SIMULTANEOUS_REQUESTS }, (_, index) =>
				postList(owner.authorization, `Racing list ${index}`)
			)
		);

		assert.equal(responses.filter(r => r.status === 201).length, 2);
		assert.equal(
			responses.filter(r => r.body.type === "LIST_LIMIT_REACHED").length,
			SIMULTANEOUS_REQUESTS - 2
		);
		assert.equal(
			await List.count({ where: { userId: owner.user.id } }),
			FREE_LIST_LIMIT
		);
	});

	void it("never exceeds the free limit when several duplicates race for the last slot", async () => {
		const owner = await createUserWithSession();
		const source = await createList(owner.user.id, "metacritic", {
			isPublic: true
		});
		for (let index = 0; index < FREE_LIST_LIMIT - 2; index++)
			await createList(owner.user.id, "metacritic");

		const responses = await Promise.all(
			Array.from({ length: SIMULTANEOUS_REQUESTS }, (_, index) =>
				api()
					.post(`/lists/${source.id}/duplicate`)
					.set("Authorization", owner.authorization)
					.send({ name: `Copy ${index}` })
			)
		);

		assert.equal(responses.filter(r => r.status === 201).length, 1);
		assert.equal(
			await List.count({ where: { userId: owner.user.id } }),
			FREE_LIST_LIMIT
		);
	});
});
