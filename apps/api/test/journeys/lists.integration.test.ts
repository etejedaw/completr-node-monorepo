import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createScoreSource
} from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface ListItemView {
	position: number;
	score: number | null;
	duration: number | null;
	ratio: number | null;
	game: { id: string };
}

interface ListView {
	id: string;
	userId: string;
	name: string;
	isPublic: boolean;
	followerCount: number;
	isFollowing: boolean;
	items: ListItemView[];
}

async function createRatedGame(title: string, score: number, hours: number) {
	const game = await createGame({ title });
	await createGameScore(game.id, scoreSource, score);
	await createGameTime(game.id, "hltb", hours);
	return game;
}

function getList(account: Account, listId: string) {
	return api()
		.get(`/lists/${listId}`)
		.set("Authorization", account.authorization);
}

async function getVisibleList(account: Account, listId: string) {
	const response = await getList(account, listId).expect(200);
	return response.body.data.list as ListView;
}

function gameIdsOf(list: ListView) {
	return list.items.map(item => item.game.id);
}

async function myListIds(account: Account) {
	const response = await api()
		.get("/lists/me")
		.set("Authorization", account.authorization)
		.expect(200);
	return (response.body.data.lists as { id: string }[]).map(list => list.id);
}

async function profileListIds(viewer: Account, owner: Account) {
	const response = await api()
		.get(`/users/${owner.user.username}/lists`)
		.set("Authorization", viewer.authorization)
		.expect(200);
	return (response.body.data.lists as { id: string }[]).map(list => list.id);
}

async function searchListIds(viewer: Account, query: string) {
	const response = await api()
		.get("/lists/search")
		.query({ query })
		.set("Authorization", viewer.authorization)
		.expect(200);
	return (response.body.data.lists as { id: string }[]).map(list => list.id);
}

async function followedListIds(account: Account) {
	const response = await api()
		.get("/lists/following")
		.set("Authorization", account.authorization)
		.expect(200);
	return (response.body.data.lists as { id: string }[]).map(list => list.id);
}

void describe("lists journey: build, share, follow, duplicate and delete a list", () => {
	let owner: Account;
	let follower: Account;
	let zelda: Game;
	let portal: Game;
	let inside: Game;
	let celeste: Game;
	let listId: string;
	let copyId: string;

	function addItem(gameId: string, account: Account = owner) {
		return api()
			.post(`/lists/${listId}/items`)
			.set("Authorization", account.authorization)
			.send({ gameId });
	}

	void it("creates a private list", async () => {
		[owner, follower] = await Promise.all([
			createUserWithSession(),
			createUserWithSession()
		]);
		[zelda, portal, inside, celeste] = await Promise.all([
			createRatedGame("Zelda", 96, 40),
			createRatedGame("Portal", 90, 4),
			createRatedGame("Inside", 86, 4),
			createRatedGame("Celeste", 92, 9)
		]);

		const response = await api()
			.post("/lists")
			.set("Authorization", owner.authorization)
			.send({
				name: "Puzzle night",
				scoreSource,
				durationSource: "hltb"
			});
		assert.equal(response.status, 201);
		listId = response.body.data.list.id;

		assert.deepEqual(await myListIds(owner), [listId]);
		const list = await getVisibleList(owner, listId);
		assert.equal(list.isPublic, false);
		assert.deepEqual(list.items, []);
	});

	void it("adds three games freezing their normalized score and duration", async () => {
		for (const game of [zelda, portal, inside]) {
			const response = await addItem(game.id);
			assert.equal(response.status, 201);
		}

		const list = await getVisibleList(owner, listId);
		assert.deepEqual(gameIdsOf(list), [zelda.id, portal.id, inside.id]);
		assert.deepEqual(
			list.items.map(item => item.position),
			[1, 2, 3]
		);
		assert.deepEqual(
			list.items.map(item => [item.score, item.duration]),
			[
				[4.8, 40],
				[4.5, 4],
				[4.3, 4]
			]
		);
		assert.equal(list.items[1]!.ratio, 22.5);
	});

	void it("adding a game already in the list keeps a single item", async () => {
		await addItem(portal.id);

		const list = await getVisibleList(owner, listId);
		assert.deepEqual(gameIdsOf(list), [zelda.id, portal.id, inside.id]);
	});

	void it("moves the last game to the top", async () => {
		const response = await api()
			.put(`/lists/${listId}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [inside.id, zelda.id, portal.id] });
		assert.equal(response.status, 200);

		const list = await getVisibleList(owner, listId);
		assert.deepEqual(gameIdsOf(list), [inside.id, zelda.id, portal.id]);
		assert.deepEqual(
			list.items.map(item => item.position),
			[1, 2, 3]
		);
		assert.deepEqual(
			list.items.map(item => item.score),
			[4.3, 4.8, 4.5]
		);
	});

	void it("removes the game in the middle", async () => {
		const response = await api()
			.delete(`/lists/${listId}/items/${zelda.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(response.status, 204);

		const list = await getVisibleList(owner, listId);
		assert.deepEqual(gameIdsOf(list), [inside.id, portal.id]);
	});

	void it("keeps positions without gaps after removing an item", async () => {
		const list = await getVisibleList(owner, listId);
		assert.deepEqual(
			list.items.map(item => item.position),
			[1, 2]
		);
	});

	void it("rejects another user touching the items and keeps them", async () => {
		const response = await addItem(celeste.id, follower);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "LIST_ITEM_FORBIDDEN");
		const list = await getVisibleList(owner, listId);
		assert.deepEqual(gameIdsOf(list), [inside.id, portal.id]);
	});

	void it("hides the private list from other users everywhere", async () => {
		const fetched = await getList(follower, listId);
		assert.equal(fetched.status, 404);
		assert.equal(fetched.body.type, "LIST_NOT_FOUND");

		assert.deepEqual(await profileListIds(follower, owner), []);
		assert.deepEqual(await searchListIds(follower, "Puzzle"), []);

		const followed = await api()
			.post(`/lists/${listId}/follow`)
			.set("Authorization", follower.authorization);
		assert.equal(followed.status, 403);
		assert.equal(followed.body.type, "LIST_FOLLOWER_NOT_PUBLIC");
		assert.deepEqual(await followedListIds(follower), []);
	});

	void it("renames the list and makes it public", async () => {
		const response = await api()
			.patch(`/lists/${listId}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Short puzzle games", isPublic: true });
		assert.equal(response.status, 200);

		const list = await getVisibleList(owner, listId);
		assert.equal(list.name, "Short puzzle games");
		assert.equal(list.isPublic, true);
	});

	void it("shows the public list to other users", async () => {
		const list = await getVisibleList(follower, listId);
		assert.equal(list.name, "Short puzzle games");
		assert.deepEqual(gameIdsOf(list), [inside.id, portal.id]);
		assert.equal(list.isFollowing, false);

		assert.deepEqual(await profileListIds(follower, owner), [listId]);
		assert.deepEqual(await searchListIds(follower, "puzzle"), [listId]);
		const recent = await api()
			.get("/lists/recent")
			.set("Authorization", follower.authorization)
			.expect(200);
		assert.ok(
			recent.body.data.lists.some(
				(entry: { id: string }) => entry.id === listId
			)
		);
	});

	void it("lets another user follow the list once", async () => {
		const followed = await api()
			.post(`/lists/${listId}/follow`)
			.set("Authorization", follower.authorization);
		assert.equal(followed.status, 201);

		const again = await api()
			.post(`/lists/${listId}/follow`)
			.set("Authorization", follower.authorization);
		assert.equal(again.status, 409);
		assert.equal(again.body.type, "LIST_FOLLOWER_ALREADY_FOLLOWING");

		const list = await getVisibleList(follower, listId);
		assert.equal(list.isFollowing, true);
		assert.equal(list.followerCount, 1);
		assert.deepEqual(await followedListIds(follower), [listId]);

		const followers = await api()
			.get(`/lists/${listId}/followers`)
			.set("Authorization", owner.authorization)
			.expect(200);
		assert.deepEqual(
			followers.body.data.users.map(
				(user: { username: string }) => user.username
			),
			[follower.user.username]
		);
	});

	void it("lets the follower duplicate the list as a private copy", async () => {
		const response = await api()
			.post(`/lists/${listId}/duplicate`)
			.set("Authorization", follower.authorization)
			.send({ name: "My puzzle backlog" });
		assert.equal(response.status, 201);
		copyId = response.body.data.list.id;

		const copy = await getVisibleList(follower, copyId);
		assert.equal(copy.userId, follower.user.id);
		assert.equal(copy.isPublic, false);
		assert.deepEqual(gameIdsOf(copy), [inside.id, portal.id]);
		assert.deepEqual(await myListIds(follower), [copyId]);
		assert.equal((await getList(owner, copyId)).status, 404);
	});

	void it("propagates the owner's edits to the follower but not to the copy", async () => {
		await addItem(celeste.id).expect(201);

		const followed = await getVisibleList(follower, listId);
		assert.deepEqual(gameIdsOf(followed), [
			inside.id,
			portal.id,
			celeste.id
		]);
		const copy = await getVisibleList(follower, copyId);
		assert.deepEqual(gameIdsOf(copy), [inside.id, portal.id]);
	});

	void it("deletes the list leaving the follower and the copy consistent", async () => {
		const response = await api()
			.delete(`/lists/${listId}`)
			.set("Authorization", owner.authorization);
		assert.equal(response.status, 204);

		assert.deepEqual(await myListIds(owner), []);
		assert.equal((await getList(follower, listId)).status, 404);
		assert.deepEqual(await followedListIds(follower), []);

		const copy = await getVisibleList(follower, copyId);
		assert.deepEqual(gameIdsOf(copy), [inside.id, portal.id]);
		assert.deepEqual(await myListIds(follower), [copyId]);

		const followAgain = await api()
			.post(`/lists/${listId}/follow`)
			.set("Authorization", follower.authorization);
		assert.equal(followAgain.status, 404);
		assert.equal(followAgain.body.type, "LIST_FOLLOWER_LIST_NOT_FOUND");
	});
});
