import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createGame,
	createPlatform,
	createScoreSource,
	createShelfEntries
} from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource();
	scoreSource = source.code;
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface FeedActivity {
	type: string;
	user: { username: string };
	target: { id: string } | null;
}

function updateProfile(account: Account, body: Record<string, unknown>) {
	return api()
		.patch("/users/me")
		.set("Authorization", account.authorization)
		.send(body)
		.expect(200);
}

function follow(follower: Account, target: Account) {
	return api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization);
}

function getProfile(viewer: Account, owner: Account) {
	return api()
		.get(`/users/${owner.user.username}`)
		.set("Authorization", viewer.authorization)
		.expect(200);
}

function getSection(viewer: Account, owner: Account, section: string) {
	return api()
		.get(`/users/${owner.user.username}/${section}`)
		.set("Authorization", viewer.authorization);
}

async function usernamesOf(viewer: Account, owner: Account, relation: string) {
	const response = await getSection(viewer, owner, relation).expect(200);
	return (response.body.data.users as { username: string }[]).map(
		user => user.username
	);
}

async function incomingRequesterIds(account: Account) {
	const response = await api()
		.get("/users/me/follow-requests")
		.set("Authorization", account.authorization)
		.expect(200);
	return (response.body.data.requests as { requesterId: string }[]).map(
		request => request.requesterId
	);
}

async function getFeed(account: Account) {
	const response = await api()
		.get("/feed")
		.set("Authorization", account.authorization)
		.expect(200);
	return response.body.data.activities as FeedActivity[];
}

function hasActivity(
	activities: FeedActivity[],
	username: string,
	type: string,
	targetId: string
) {
	return activities.some(
		activity =>
			activity.user.username === username &&
			activity.type === type &&
			activity.target?.id === targetId
	);
}

void describe("social and privacy journey: follows, requests, visibility and feed", () => {
	let alice: Account;
	let bob: Account;
	let carol: Account;
	let platform: Platform;
	let bobGame: Game;
	let bobWish: Game;
	let aliceGame: Game;
	let carolListId: string;

	void it("sets up a public profile with a friends-only shelf and a private profile", async () => {
		[alice, bob, carol] = await Promise.all([
			createUserWithSession(),
			createUserWithSession(),
			createUserWithSession()
		]);
		platform = await createPlatform();
		[bobGame, bobWish, aliceGame] = await Promise.all([
			createGame({ title: "Disco Elysium" }),
			createGame({ title: "Pentiment" }),
			createGame({ title: "Tunic" })
		]);

		await updateProfile(bob, { shelfVisibility: "friends" });
		await createShelfEntries(bob.user.id, bobGame.id, platform.id, 1);
		await updateProfile(carol, { profileVisibility: "private" });
		const list = await api()
			.post("/lists")
			.set("Authorization", carol.authorization)
			.send({
				name: "Carol picks",
				isPublic: true,
				scoreSource,
				durationSource: "hltb"
			})
			.expect(201);
		carolListId = list.body.data.list.id;

		const carolSeenByAlice = await getProfile(alice, carol);
		assert.equal(carolSeenByAlice.body.data.isPrivate, true);
		assert.equal(carolSeenByAlice.body.data.acceptFollowRequests, true);
	});

	void it("follows a public profile right away", async () => {
		const response = await follow(alice, bob);
		assert.equal(response.status, 201);
		assert.equal(response.body.data.status, "accepted");
		assert.equal(response.body.data.targetId, bob.user.id);

		assert.deepEqual(await usernamesOf(alice, bob, "followers"), [
			alice.user.username
		]);
		assert.deepEqual(await usernamesOf(alice, alice, "following"), [
			bob.user.username
		]);
		const profile = await getProfile(alice, bob);
		assert.equal(profile.body.data.isFollowing, true);
		assert.equal(profile.body.data.followerCount, 1);
	});

	void it("rejects following the same profile twice", async () => {
		const response = await follow(alice, bob);

		assert.equal(response.status, 409);
		assert.equal(
			response.body.type,
			"USER_FOLLOW_REQUEST_ALREADY_FOLLOWING"
		);
		assert.equal((await getProfile(alice, bob)).body.data.followerCount, 1);
	});

	void it("shows the public backlog but not the friends-only shelf to a one-way follower", async () => {
		await getSection(alice, bob, "backlog").expect(200);

		const shelf = await getSection(alice, bob, "game-shelf");
		assert.equal(shelf.status, 403);
		assert.equal(shelf.body.type, "USER_PRIVATE");
		assert.equal(
			(await getProfile(alice, bob)).body.data.access.shelf,
			false
		);
	});

	void it("opens the friends-only shelf once the follow is mutual", async () => {
		const response = await follow(bob, alice);
		assert.equal(response.status, 201);
		assert.equal(response.body.data.status, "accepted");

		const shelf = await getSection(alice, bob, "game-shelf").expect(200);
		assert.equal(shelf.body.data.total, 1);
		assert.equal(
			(await getProfile(alice, bob)).body.data.access.shelf,
			true
		);
	});

	void it("sends a follow request to a private profile", async () => {
		const response = await follow(alice, carol);
		assert.equal(response.status, 201);
		assert.equal(response.body.data.status, "pending");

		assert.deepEqual(await incomingRequesterIds(carol), [alice.user.id]);
		const profile = await getProfile(alice, carol);
		assert.equal(profile.body.data.isPrivate, true);
		assert.equal(profile.body.data.hasPendingRequest, true);
		assert.equal(profile.body.data.isFollowing, false);
		assert.equal(profile.body.data.followerCount, 0);
	});

	void it("rejects a duplicated follow request", async () => {
		const response = await follow(alice, carol);

		assert.equal(response.status, 409);
		assert.equal(
			response.body.type,
			"USER_FOLLOW_REQUEST_ALREADY_REQUESTED"
		);
		assert.deepEqual(await incomingRequesterIds(carol), [alice.user.id]);
	});

	void it("rejects one request and keeps the other pending", async () => {
		await follow(bob, carol).expect(201);
		assert.deepEqual(
			new Set(await incomingRequesterIds(carol)),
			new Set([alice.user.id, bob.user.id])
		);

		await api()
			.post(`/users/me/follow-requests/${bob.user.id}/reject`)
			.set("Authorization", carol.authorization)
			.expect(204);

		assert.deepEqual(await incomingRequesterIds(carol), [alice.user.id]);
		const bobView = await getProfile(bob, carol);
		assert.equal(bobView.body.data.hasPendingRequest, false);
		assert.equal(bobView.body.data.isFollowing, false);

		const again = await api()
			.post(`/users/me/follow-requests/${bob.user.id}/reject`)
			.set("Authorization", carol.authorization);
		assert.equal(again.status, 404);
		assert.equal(again.body.type, "USER_FOLLOW_REQUEST_NOT_FOUND");
	});

	void it("accepts a request turning it into a follow that still respects the private profile", async () => {
		await api()
			.post(`/users/me/follow-requests/${alice.user.id}/accept`)
			.set("Authorization", carol.authorization)
			.expect(204);

		assert.deepEqual(await incomingRequesterIds(carol), []);
		assert.deepEqual(await usernamesOf(carol, carol, "followers"), [
			alice.user.username
		]);
		const profile = await getProfile(alice, carol);
		assert.equal(profile.body.data.isPrivate, true);
		assert.equal(profile.body.data.isFollowing, true);
		assert.equal(profile.body.data.hasPendingRequest, false);

		const backlog = await getSection(alice, carol, "backlog");
		assert.equal(backlog.status, 403);
		assert.equal(backlog.body.type, "USER_PRIVATE");
	});

	void it("shows a friends-only profile to mutual followers only", async () => {
		await updateProfile(carol, {
			profileVisibility: "friends",
			listVisibility: "friends"
		});
		await follow(carol, alice).expect(201);

		await getSection(alice, carol, "backlog").expect(200);
		const aliceLists = await getSection(alice, carol, "lists").expect(200);
		assert.deepEqual(
			aliceLists.body.data.lists.map((list: { id: string }) => list.id),
			[carolListId]
		);

		for (const section of ["backlog", "lists"]) {
			const response = await getSection(bob, carol, section);
			assert.equal(response.status, 403);
			assert.equal(response.body.type, "USER_PRIVATE");
		}
		assert.equal((await getProfile(bob, carol)).body.data.isPrivate, true);
	});

	void it("reflects the actions of followed users and the own ones in the feed", async () => {
		await api()
			.post("/users/me/backlog")
			.set("Authorization", bob.authorization)
			.send({
				gameId: bobGame.id,
				platformId: platform.id,
				score: 4.5,
				duration: 20
			})
			.expect(201);
		await api()
			.post("/users/me/wishlist")
			.set("Authorization", bob.authorization)
			.send({ gameId: bobWish.id })
			.expect(201);
		await api()
			.post("/users/me/backlog")
			.set("Authorization", alice.authorization)
			.send({
				gameId: aliceGame.id,
				platformId: platform.id,
				score: 4,
				duration: 12
			})
			.expect(201);

		await eventually(async () => {
			const feed = await getFeed(alice);
			assert.ok(
				hasActivity(
					feed,
					bob.user.username,
					"backlog_added",
					bobGame.id
				)
			);
			assert.ok(
				hasActivity(
					feed,
					bob.user.username,
					"wishlist_added",
					bobWish.id
				)
			);
			assert.ok(
				hasActivity(
					feed,
					alice.user.username,
					"backlog_added",
					aliceGame.id
				)
			);
		});
		const feed = await getFeed(alice);
		assert.ok(feed.every(activity => activity.type !== "user_followed"));
	});

	void it("unfollows a profile closing the friends-only sections and its feed", async () => {
		await api()
			.delete(`/users/${bob.user.username}/follow`)
			.set("Authorization", alice.authorization)
			.expect(204);

		assert.deepEqual(await usernamesOf(alice, bob, "followers"), []);
		assert.equal(
			(await getProfile(alice, bob)).body.data.isFollowing,
			false
		);
		const shelf = await getSection(alice, bob, "game-shelf");
		assert.equal(shelf.status, 403);
		assert.equal(shelf.body.type, "USER_PRIVATE");

		const feed = await getFeed(alice);
		assert.ok(
			feed.every(activity => activity.user.username !== bob.user.username)
		);
		assert.ok(
			hasActivity(
				feed,
				alice.user.username,
				"backlog_added",
				aliceGame.id
			)
		);
	});

	void it("rejects unfollowing a profile that is not followed", async () => {
		const response = await api()
			.delete(`/users/${bob.user.username}/follow`)
			.set("Authorization", alice.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_FOLLOWER_NOT_FOLLOWING");
		assert.deepEqual(await usernamesOf(bob, bob, "following"), [
			alice.user.username
		]);
	});
});
