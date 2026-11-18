import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { MoodTagMeta } from "../../src/mood-tags/mood-tag-meta.model";
import { api } from "../helpers/app.helper";
import { type Account, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";

const FAVORITES_PATH = "/users/me/mood-tags/favorites";
const MY_TAGS_PATH = "/users/me/mood-tags";

useTestDatabase();

interface MyTagBody {
	tag: string;
	usageCount: number;
	description: string | null;
	favoriteOrder: number | null;
}

function uniqueTag(label: string) {
	return `${label} ${randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function putFavorites(authorization: string, tags: unknown) {
	return api()
		.put(FAVORITES_PATH)
		.set("Authorization", authorization)
		.send({ tags });
}

async function tagGame(account: Account, tags: string[]) {
	const game = await createGame();
	await api()
		.put(`/users/me/games/${game.id}/mood-tags`)
		.set("Authorization", account.authorization)
		.send({ tags })
		.expect(200);
	return game;
}

async function createTags(account: Account, tags: string[]) {
	for (const tag of tags)
		await api()
			.post(MY_TAGS_PATH)
			.set("Authorization", account.authorization)
			.send({ tag })
			.expect(201);
}

async function getMyTags(authorization: string) {
	const response = await api()
		.get(MY_TAGS_PATH)
		.set("Authorization", authorization)
		.expect(200);
	return response.body.data.tags as MyTagBody[];
}

async function favoritesInOrder(authorization: string) {
	const tags = await getMyTags(authorization);
	return tags
		.filter(entry => entry.favoriteOrder !== null)
		.sort((a, b) => a.favoriteOrder! - b.favoriteOrder!)
		.map(entry => [entry.tag, entry.favoriteOrder]);
}

function ordered(tags: string[]) {
	return tags.map((tag, index) => [tag, index]);
}

async function ownerWithTags(count: number) {
	const owner = await createUserWithSession();
	const tags = Array.from({ length: count }, (_, index) =>
		uniqueTag(`fav${index}`)
	);
	await createTags(owner, tags);
	return { owner, tags };
}

void describe("PUT /users/me/mood-tags/favorites", () => {
	void it("stores the favorites in the given order and exposes favoriteOrder in the tag list", async () => {
		const { owner, tags } = await ownerWithTags(4);
		const [first, second, third, notFavorite] = tags as [
			string,
			string,
			string,
			string
		];

		const response = await putFavorites(owner.authorization, [
			third,
			first,
			second
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { tags: [third, first, second] });
		const myTags = await getMyTags(owner.authorization);
		const orderByTag = Object.fromEntries(
			myTags.map(entry => [entry.tag, entry.favoriteOrder])
		);
		assert.deepEqual(orderByTag, {
			[third]: 0,
			[first]: 1,
			[second]: 2,
			[notFavorite]: null
		});
	});

	void it("normalizes the sent tags before matching them", async () => {
		const owner = await createUserWithSession();
		const suffix = randomUUID().slice(0, 6);
		await tagGame(owner, [`Relajación ${suffix}`]);

		const response = await putFavorites(owner.authorization, [
			`  RELAJACION   ${suffix.toUpperCase()} `
		]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.tags, [`relajacion ${suffix}`]);
	});

	void it("accepts a tag that only lives on games and keeps it after it leaves every game", async () => {
		const owner = await createUserWithSession();
		const tag = uniqueTag("games-only");
		const game = await tagGame(owner, [tag]);

		await putFavorites(owner.authorization, [tag]).expect(200);
		await api()
			.put(`/users/me/games/${game.id}/mood-tags`)
			.set("Authorization", owner.authorization)
			.send({ tags: [] })
			.expect(200);

		assert.deepEqual(await favoritesInOrder(owner.authorization), [
			[tag, 0]
		]);
	});

	void it("clears every favorite with an empty list", async () => {
		const { owner, tags } = await ownerWithTags(2);
		await putFavorites(owner.authorization, tags).expect(200);

		const response = await putFavorites(owner.authorization, []);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.tags, []);
		assert.deepEqual(await favoritesInOrder(owner.authorization), []);
	});

	void it("rejects more than five favorites, duplicates after normalization and unknown tags, keeping the previous favorites", async () => {
		const { owner, tags } = await ownerWithTags(6);
		const stranger = await createUserWithSession();
		const strangerTag = uniqueTag("theirs");
		await createTags(stranger, [strangerTag]);
		await putFavorites(owner.authorization, [tags[1], tags[0]]).expect(200);

		const cases = [
			{ body: tags, code: "MOOD_TAGS_TOO_MANY_FAVORITES" },
			{
				body: [tags[0], ` ${tags[0]!.toUpperCase()} `],
				code: "MOOD_TAGS_DUPLICATED_FAVORITE"
			},
			{
				body: [tags[0], "never used"],
				code: "MOOD_TAGS_FAVORITE_UNKNOWN_TAG"
			},
			{ body: [strangerTag], code: "MOOD_TAGS_FAVORITE_UNKNOWN_TAG" },
			{ body: ["́"], code: "MOOD_TAGS_INVALID_TAG" }
		];
		for (const { body, code } of cases) {
			const response = await putFavorites(owner.authorization, body);
			assert.equal(response.status, 422, code);
			assert.equal(response.body.type, code);
		}

		assert.deepEqual(
			await favoritesInOrder(owner.authorization),
			ordered([tags[1]!, tags[0]!])
		);
	});

	void it("rejects malformed bodies", async () => {
		const owner = await createUserWithSession();
		const bodies = [
			{},
			{ tags: "cozy" },
			{ tags: [1, 2] },
			{ tags: [""] },
			{ tags: ["   "] },
			{ tags: ["a".repeat(41)] },
			{ tags: [], extra: true }
		];

		for (const body of bodies) {
			const response = await api()
				.put(FAVORITES_PATH)
				.set("Authorization", owner.authorization)
				.send(body);
			assert.equal(response.status, 422, JSON.stringify(body));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("requires a valid session", async () => {
		const missing = await api().put(FAVORITES_PATH).send({ tags: [] });
		const forged = await api()
			.put(FAVORITES_PATH)
			.set("Authorization", "Bearer not-a-token")
			.send({ tags: [] });

		assert.equal(missing.status, 422);
		assert.equal(missing.body.type, "AUTH_SCHEMA_INVALID");
		assert.equal(forged.status, 401);
	});

	void it("gives the same result when the same request arrives twice", async () => {
		const { owner, tags } = await ownerWithTags(3);

		const responses = await Promise.all([
			putFavorites(owner.authorization, tags),
			putFavorites(owner.authorization, tags)
		]);
		await putFavorites(owner.authorization, tags).expect(200);

		assert.deepEqual(
			responses.map(response => response.status),
			[200, 200]
		);
		assert.deepEqual(
			await favoritesInOrder(owner.authorization),
			ordered(tags)
		);
	});

	void it("ends with exactly one of the competing lists when several arrive at once", async () => {
		const { owner, tags } = await ownerWithTags(5);
		const candidates = [
			tags,
			[...tags].reverse(),
			tags.slice(0, 2),
			[tags[4]!, tags[2]!],
			[],
			tags.slice(1, 4)
		];

		const responses = await Promise.all(
			candidates.map(candidate =>
				putFavorites(owner.authorization, candidate)
			)
		);

		assert.ok(responses.every(response => response.status === 200));
		const final = await favoritesInOrder(owner.authorization);
		assert.ok(
			candidates.some(
				candidate =>
					JSON.stringify(ordered(candidate)) === JSON.stringify(final)
			),
			JSON.stringify(final)
		);
	});

	void it("keeps the order contiguous when a favorite is deleted while the list is being replaced", async () => {
		const { owner, tags } = await ownerWithTags(4);
		await putFavorites(owner.authorization, tags).expect(200);

		const [replaced, deleted] = await Promise.all([
			putFavorites(owner.authorization, [tags[3]!, tags[1]!, tags[0]!]),
			api()
				.delete(`${MY_TAGS_PATH}/${encodeURIComponent(tags[1]!)}`)
				.set("Authorization", owner.authorization)
		]);

		assert.equal(deleted.status, 204);
		assert.ok([200, 422].includes(replaced.status));
		const final = await favoritesInOrder(owner.authorization);
		assert.deepEqual(
			final.map(([, order]) => order),
			final.map((_, index) => index)
		);
		assert.ok(!final.some(([tag]) => tag === tags[1]));
	});
});

void describe("renaming and deleting a favorite tag", () => {
	void it("keeps the position when a favorite is renamed", async () => {
		const { owner, tags } = await ownerWithTags(3);
		await putFavorites(owner.authorization, tags).expect(200);
		const renamed = uniqueTag("renamed");

		await api()
			.patch(`${MY_TAGS_PATH}/${encodeURIComponent(tags[1]!)}`)
			.set("Authorization", owner.authorization)
			.send({ newTag: renamed })
			.expect(200);

		assert.deepEqual(
			await favoritesInOrder(owner.authorization),
			ordered([tags[0]!, renamed, tags[2]!])
		);
	});

	void it("keeps the earliest position when a favorite is merged into another favorite", async () => {
		const { owner, tags } = await ownerWithTags(4);
		const [a, b, c, d] = tags as [string, string, string, string];
		await putFavorites(owner.authorization, [a, b, c, d]).expect(200);

		await api()
			.patch(`${MY_TAGS_PATH}/${encodeURIComponent(c)}`)
			.set("Authorization", owner.authorization)
			.send({ newTag: a })
			.expect(200);

		assert.deepEqual(
			await favoritesInOrder(owner.authorization),
			ordered([a, b, d])
		);
	});

	void it("moves the favorite position to the target when the target was not a favorite", async () => {
		const { owner, tags } = await ownerWithTags(3);
		const [a, b, target] = tags as [string, string, string];
		await putFavorites(owner.authorization, [a, b]).expect(200);

		await api()
			.patch(`${MY_TAGS_PATH}/${encodeURIComponent(a)}`)
			.set("Authorization", owner.authorization)
			.send({ newTag: target })
			.expect(200);

		assert.deepEqual(
			await favoritesInOrder(owner.authorization),
			ordered([target, b])
		);
	});

	void it("removes a deleted tag from the favorites and closes the gap", async () => {
		const { owner, tags } = await ownerWithTags(3);
		await putFavorites(owner.authorization, tags).expect(200);

		await api()
			.delete(`${MY_TAGS_PATH}/${encodeURIComponent(tags[0]!)}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		assert.deepEqual(
			await favoritesInOrder(owner.authorization),
			ordered([tags[1]!, tags[2]!])
		);
		assert.equal(
			await MoodTagMeta.count({
				where: { userId: owner.user.id, tag: tags[0]! }
			}),
			0
		);
	});

	void it("does not touch another user's favorites with the same tag name", async () => {
		const tag = uniqueTag("shared");
		const owner = await createUserWithSession();
		const other = await createUserWithSession();
		await createTags(owner, [tag]);
		await createTags(other, [tag]);
		await putFavorites(owner.authorization, [tag]).expect(200);
		await putFavorites(other.authorization, [tag]).expect(200);

		await api()
			.delete(`${MY_TAGS_PATH}/${encodeURIComponent(tag)}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		assert.deepEqual(await favoritesInOrder(other.authorization), [
			[tag, 0]
		]);
	});
});
