import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { MoodTagMeta } from "../../src/mood-tags/mood-tag-meta.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { type Account, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createUser } from "../helpers/factories.helper";

useTestDatabase();

function uniqueTag(label: string) {
	return `${label} ${randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function tagsPath(username: string) {
	return `/users/${username}/tags`;
}

async function setVisibility(userId: string, values: Record<string, string>) {
	await User.update(values, { where: { id: userId } });
}

async function makeMutual(first: Account, second: Account) {
	await UserFollower.bulkCreate([
		{ followerId: first.user.id, followingId: second.user.id },
		{ followerId: second.user.id, followingId: first.user.id }
	]);
}

async function seedFavorites(owner: Account) {
	const [first, second, plain] = [
		uniqueTag("first"),
		uniqueTag("second"),
		uniqueTag("plain")
	];
	await api()
		.post("/users/me/mood-tags")
		.set("Authorization", owner.authorization)
		.send({ tag: second, description: "Rainy afternoons" })
		.expect(201);
	for (const tag of [first, plain])
		await api()
			.post("/users/me/mood-tags")
			.set("Authorization", owner.authorization)
			.send({ tag })
			.expect(201);
	await api()
		.put("/users/me/mood-tags/favorites")
		.set("Authorization", owner.authorization)
		.send({ tags: [first, second] })
		.expect(200);
	return { first, second, plain };
}

void describe("GET /users/:username/tags", () => {
	void it("returns the favorite tags in order with their description and nothing that identifies the owner", async () => {
		const owner = await createUserWithSession();
		const { first, second } = await seedFavorites(owner);

		const response = await api().get(tagsPath(owner.user.username));

		assert.equal(response.status, 200);
		assert.deepEqual(response.body, {
			data: {
				tags: [
					{ tag: first, description: null },
					{ tag: second, description: "Rainy afternoons" }
				]
			}
		});
		assert.equal(
			JSON.stringify(response.body).includes(owner.user.id),
			false
		);
	});

	void it("answers an empty list when the user has no favorites", async () => {
		const owner = await createUser();
		await MoodTagMeta.create({ userId: owner.id, tag: uniqueTag("nofav") });

		const response = await api().get(tagsPath(owner.username));

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.tags, []);
	});

	void it("answers 404 for an unknown or deactivated user", async () => {
		const deactivated = await createUser({ isActive: false });

		for (const username of ["nobody_tags", deactivated.username]) {
			const response = await api().get(tagsPath(username));
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		}
	});

	void it("follows the profile rule before the tag section", async () => {
		const owner = await createUserWithSession();
		await seedFavorites(owner);
		await setVisibility(owner.user.id, {
			profileVisibility: "private",
			tagVisibility: "public"
		});
		const viewer = await createUserWithSession();

		const anonymous = await api().get(tagsPath(owner.user.username));
		const loggedIn = await api()
			.get(tagsPath(owner.user.username))
			.set("Authorization", viewer.authorization);

		for (const response of [anonymous, loggedIn]) {
			assert.equal(response.status, 403);
			assert.equal(response.body.type, "USER_PRIVATE");
		}
	});

	void it("hides a private or friends-only tag section from strangers and opens it to mutual followers", async () => {
		const owner = await createUserWithSession();
		const { first, second } = await seedFavorites(owner);
		const stranger = await createUserWithSession();
		const friend = await createUserWithSession();
		await makeMutual(owner, friend);

		for (const level of ["private", "friends"]) {
			await setVisibility(owner.user.id, { tagVisibility: level });
			const anonymous = await api().get(tagsPath(owner.user.username));
			const loggedIn = await api()
				.get(tagsPath(owner.user.username))
				.set("Authorization", stranger.authorization);
			for (const response of [anonymous, loggedIn]) {
				assert.equal(response.status, 403, level);
				assert.equal(response.body.type, "USER_PRIVATE");
			}
		}

		const asFriend = await api()
			.get(tagsPath(owner.user.username))
			.set("Authorization", friend.authorization);
		assert.equal(asFriend.status, 200);
		assert.deepEqual(
			asFriend.body.data.tags.map((entry: { tag: string }) => entry.tag),
			[first, second]
		);

		await setVisibility(owner.user.id, { tagVisibility: "private" });
		const friendOnPrivate = await api()
			.get(tagsPath(owner.user.username))
			.set("Authorization", friend.authorization);
		assert.equal(friendOnPrivate.status, 403);
	});

	void it("lets the owner read their own private tags", async () => {
		const owner = await createUserWithSession();
		const { first, second } = await seedFavorites(owner);
		await setVisibility(owner.user.id, {
			profileVisibility: "private",
			tagVisibility: "private"
		});

		const response = await api()
			.get(tagsPath(owner.user.username))
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.tags.map((entry: { tag: string }) => entry.tag),
			[first, second]
		);
	});

	void it("answers every parallel request the same while the owner flips the section", async () => {
		const owner = await createUserWithSession();
		await seedFavorites(owner);
		await setVisibility(owner.user.id, { tagVisibility: "private" });

		const responses = await Promise.all(
			Array.from({ length: 6 }, () =>
				api().get(tagsPath(owner.user.username))
			)
		);

		assert.deepEqual(
			responses.map(response => response.status),
			Array(6).fill(403)
		);
		await setVisibility(owner.user.id, { tagVisibility: "public" });
		const opened = await api().get(tagsPath(owner.user.username));
		assert.equal(opened.status, 200);
	});
});

void describe("tagVisibility on /users/me", () => {
	void it("starts public for a new account and is returned by GET /users/me", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.get("/users/me")
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.user.tagVisibility, "public");
	});

	void it("is updated by PATCH /users/me and rejects unknown levels", async () => {
		const owner = await createUserWithSession();

		const patched = await api()
			.patch("/users/me")
			.set("Authorization", owner.authorization)
			.send({ tagVisibility: "friends" });
		const invalid = await api()
			.patch("/users/me")
			.set("Authorization", owner.authorization)
			.send({ tagVisibility: "everyone" });
		const me = await api()
			.get("/users/me")
			.set("Authorization", owner.authorization);

		assert.equal(patched.status, 200);
		assert.equal(invalid.status, 422);
		assert.equal(invalid.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(me.body.data.user.tagVisibility, "friends");
	});

	void it("reports the tag section in the profile access map", async () => {
		const owner = await createUserWithSession();
		await setVisibility(owner.user.id, { tagVisibility: "private" });

		const visitor = await api().get(`/users/${owner.user.username}`);
		const self = await api()
			.get(`/users/${owner.user.username}`)
			.set("Authorization", owner.authorization);

		assert.equal(visitor.status, 200);
		assert.equal(visitor.body.data.access.tag, false);
		assert.equal(self.body.data.access.tag, true);
	});
});
