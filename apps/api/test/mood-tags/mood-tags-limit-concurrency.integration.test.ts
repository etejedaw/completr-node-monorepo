import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MoodTagMeta } from "../../src/mood-tags/mood-tag-meta.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";

const MY_TAGS_PATH = "/users/me/mood-tags";
const FREE_TAG_LIMIT = 25;
const PARALLEL_REQUESTS = 40;
const SEATS_LEFT = 3;

useTestDatabase();

function distinctTags(count: number) {
	return Array.from({ length: count }, (_, index) => `parallel ${index}`);
}

function postTag(authorization: string, tag: string) {
	return api()
		.post(MY_TAGS_PATH)
		.set("Authorization", authorization)
		.send({ tag });
}

function describeTag(authorization: string, tag: string) {
	return api()
		.patch(`${MY_TAGS_PATH}/${encodeURIComponent(tag)}`)
		.set("Authorization", authorization)
		.send({ description: "described" });
}

function countTags(userId: string) {
	return MoodTagMeta.count({ where: { userId } });
}

function statusCounts(statuses: number[]) {
	const counts = new Map<number, number>();
	for (const status of statuses)
		counts.set(status, (counts.get(status) ?? 0) + 1);
	return counts;
}

void describe("mood tag free limit under parallel requests", () => {
	void it("never lets parallel POSTs of new tags pass the free limit", async () => {
		const owner = await createUserWithSession("user");

		const responses = await Promise.all(
			distinctTags(PARALLEL_REQUESTS).map(tag =>
				postTag(owner.authorization, tag)
			)
		);

		const counts = statusCounts(responses.map(response => response.status));
		assert.equal(counts.get(201), FREE_TAG_LIMIT);
		assert.equal(counts.get(402), PARALLEL_REQUESTS - FREE_TAG_LIMIT);
		assert.equal(await countTags(owner.user.id), FREE_TAG_LIMIT);
	});

	void it("never lets parallel descriptions of new tags pass the free limit", async () => {
		const owner = await createUserWithSession("user");

		const responses = await Promise.all(
			distinctTags(PARALLEL_REQUESTS).map(tag =>
				describeTag(owner.authorization, tag)
			)
		);

		const counts = statusCounts(responses.map(response => response.status));
		assert.equal(counts.get(200), FREE_TAG_LIMIT);
		assert.equal(counts.get(402), PARALLEL_REQUESTS - FREE_TAG_LIMIT);
		assert.equal(await countTags(owner.user.id), FREE_TAG_LIMIT);
	});

	void it("only fills the remaining seats when the same tags arrive twice at once", async () => {
		const owner = await createUserWithSession("user");
		await MoodTagMeta.bulkCreate(
			distinctTags(FREE_TAG_LIMIT - SEATS_LEFT).map(tag => ({
				userId: owner.user.id,
				tag: `seeded ${tag}`
			}))
		);
		const tags = distinctTags(SEATS_LEFT + 2);

		const responses = await Promise.all(
			[...tags, ...tags].map(tag => postTag(owner.authorization, tag))
		);

		assert.equal(
			responses.filter(response => response.status === 500).length,
			0
		);
		assert.equal(await countTags(owner.user.id), FREE_TAG_LIMIT);
	});

	void it("does not limit a premium user", async () => {
		const owner = await createUserWithSession("premium");

		const responses = await Promise.all(
			distinctTags(PARALLEL_REQUESTS).map(tag =>
				postTag(owner.authorization, tag)
			)
		);

		assert.ok(responses.every(response => response.status === 201));
		assert.equal(await countTags(owner.user.id), PARALLEL_REQUESTS);
	});
});
