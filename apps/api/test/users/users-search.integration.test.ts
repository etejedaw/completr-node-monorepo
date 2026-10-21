import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { Favorite } from "../../src/favorites/favorite.model";
import { type User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession } from "../helpers/auth.helper";
import { truncateAllTables, useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

useTestDatabase();

type SearchQuery = Record<string, string | number>;

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface UserCard {
	id: string;
	username: string;
	name: string;
	role: string;
	isSelf: boolean;
	profileVisibility: string;
	followerCount: number | null;
	isFollowing: boolean;
	gamesTotal: number | null;
	completedTotal: number | null;
	featuredGame: { title: string; backgroundUrl: string | null } | null;
}

function uniqueTag() {
	return randomUUID().replaceAll("-", "").slice(0, 5);
}

function search(account: Account | undefined, query: SearchQuery) {
	const request = api().get("/users/search").query(query);
	return account
		? request.set("Authorization", account.authorization)
		: request;
}

function discover(account: Account | undefined, query: SearchQuery = {}) {
	const request = api().get("/users/discover").query(query);
	return account
		? request.set("Authorization", account.authorization)
		: request;
}

function cardsOf(response: { body: { data: { users: UserCard[] } } }) {
	return response.body.data.users;
}

function usernamesOf(response: { body: { data: { users: UserCard[] } } }) {
	return cardsOf(response).map(card => card.username);
}

async function createNamedAccount(username: string, name: string) {
	const account = await createUserWithSession();
	await account.user.update({ username, name });
	return account;
}

function updateVisibility(user: User, changes: Record<string, unknown>) {
	return user.update(changes);
}

function follow(follower: Account, target: Account) {
	return api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization)
		.expect(201);
}

async function addBacklogEntry(
	userId: string,
	platformId: string,
	status: "completed" | "playing",
	isPublic: boolean
) {
	const game = await createGame();
	return Backlog.create({
		userId,
		gameId: game.id,
		platformId,
		status,
		score: 4,
		duration: 10,
		isPublic
	});
}

void describe("GET /users/search", () => {
	void it("finds users by a username fragment ignoring case and orders them by username", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		await createNamedAccount(`find_${tag}_b`, "Second Match");
		await createNamedAccount(`find_${tag}_a`, "First Match");
		await createNamedAccount(`other_${tag}`, "Unrelated");

		const response = await search(viewer, {
			q: `FIND_${tag.toUpperCase()}`
		});

		assert.equal(response.status, 200);
		assert.deepEqual(usernamesOf(response), [
			`find_${tag}_a`,
			`find_${tag}_b`
		]);
	});

	void it("finds users by a display name fragment", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const target = await createNamedAccount(
			`byname_${tag}`,
			`Zelda Speedrunner ${tag}`
		);

		const response = await search(viewer, {
			q: `zelda speedrunner ${tag}`
		});

		assert.equal(response.status, 200);
		assert.deepEqual(
			cardsOf(response).map(card => card.id),
			[target.user.id]
		);
	});

	void it("answers an empty list when nobody matches", async () => {
		const viewer = await createUserWithSession();

		const response = await search(viewer, { q: `nomatch_${uniqueTag()}` });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { users: [] });
	});

	void it("caps the results with limit keeping the username order", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		for (const suffix of ["c", "a", "b"]) {
			await createNamedAccount(
				`cap_${tag}_${suffix}`,
				`Capped ${suffix}`
			);
		}

		const response = await search(viewer, { q: `cap_${tag}`, limit: 2 });

		assert.equal(response.status, 200);
		assert.deepEqual(usernamesOf(response), [
			`cap_${tag}_a`,
			`cap_${tag}_b`
		]);
	});

	void it("finds an account by its exact email ignoring case without exposing the email", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const target = await createUser({
			username: `mail_${tag}`,
			email: `exact_${tag}@completr.test`
		});

		const response = await search(viewer, {
			email: `EXACT_${tag}@Completr.Test`
		});

		assert.equal(response.status, 200);
		assert.deepEqual(
			cardsOf(response).map(card => card.id),
			[target.id]
		);
		assert.ok(!JSON.stringify(response.body).includes(target.email));
		assert.ok(!("email" in cardsOf(response)[0]!));
	});

	void it("does not match an email by fragment and answers empty for an unknown one", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		await createUser({
			username: `frag_${tag}`,
			email: `fragment_${tag}@completr.test`
		});

		const partial = await search(viewer, {
			email: `fragment_${tag}@x.test`
		});
		const unknown = await search(viewer, {
			email: `ghost_${tag}@completr.test`
		});

		assert.deepEqual(cardsOf(partial), []);
		assert.deepEqual(cardsOf(unknown), []);
	});

	void it("lets the email take precedence over q when both are sent", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const byEmail = await createUser({
			username: `prec_a_${tag}`,
			email: `prec_${tag}@completr.test`
		});
		await createNamedAccount(`prec_b_${tag}`, "Matches q only");

		const response = await search(viewer, {
			email: byEmail.email,
			q: `prec_b_${tag}`
		});

		assert.deepEqual(
			cardsOf(response).map(card => card.id),
			[byEmail.id]
		);
	});

	void it("includes the caller flagged as self with the private entries counted", async () => {
		const tag = uniqueTag();
		const caller = await createNamedAccount(`self_${tag}`, "Caller");
		const platform = await createPlatform();
		await addBacklogEntry(caller.user.id, platform.id, "completed", true);
		await addBacklogEntry(caller.user.id, platform.id, "completed", false);
		await addBacklogEntry(caller.user.id, platform.id, "playing", false);

		const response = await search(caller, { q: `self_${tag}` });

		const [card] = cardsOf(response);
		assert.equal(response.status, 200);
		assert.equal(card!.isSelf, true);
		assert.equal(card!.isFollowing, false);
		assert.equal(card!.gamesTotal, 3);
		assert.equal(card!.completedTotal, 2);
	});

	void it("builds the card of a public profile with only its public backlog and its first favorite", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const target = await createNamedAccount(`pub_${tag}`, "Public Card");
		const platform = await createPlatform();
		await addBacklogEntry(target.user.id, platform.id, "completed", true);
		await addBacklogEntry(target.user.id, platform.id, "playing", true);
		await addBacklogEntry(target.user.id, platform.id, "completed", false);
		const favoriteGame = await createGame({ title: `Favorite ${tag}` });
		await Favorite.create({
			userId: target.user.id,
			gameId: favoriteGame.id,
			position: 1
		});
		await follow(viewer, target);

		const response = await search(viewer, { q: `pub_${tag}` });

		const [card] = cardsOf(response);
		assert.equal(card!.isSelf, false);
		assert.equal(card!.isFollowing, true);
		assert.equal(card!.followerCount, 1);
		assert.equal(card!.gamesTotal, 2);
		assert.equal(card!.completedTotal, 1);
		assert.equal(card!.profileVisibility, "public");
		assert.equal(card!.role, "user");
		assert.equal(card!.featuredGame?.title, `Favorite ${tag}`);
	});

	void it("hides the stats of a private profile but keeps the follow state", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const target = await createNamedAccount(`closed_${tag}`, "Closed");
		const platform = await createPlatform();
		await addBacklogEntry(target.user.id, platform.id, "completed", true);
		await updateVisibility(target.user, { profileVisibility: "private" });

		const response = await search(viewer, { q: `closed_${tag}` });

		const [card] = cardsOf(response);
		assert.equal(response.status, 200);
		assert.equal(card!.profileVisibility, "private");
		assert.equal(card!.isFollowing, false);
		assert.equal(card!.followerCount, null);
		assert.equal(card!.gamesTotal, null);
		assert.equal(card!.completedTotal, null);
		assert.equal(card!.featuredGame, null);
	});

	void it("shows a friends-only profile only to mutual followers", async () => {
		const tag = uniqueTag();
		const oneWay = await createUserWithSession();
		const mutual = await createUserWithSession();
		const target = await createNamedAccount(`friends_${tag}`, "Friends");
		await updateVisibility(target.user, { profileVisibility: "friends" });
		await follow(oneWay, target);
		await follow(mutual, target);
		await follow(target, mutual);

		const seenByOneWay = await search(oneWay, { q: `friends_${tag}` });
		const seenByMutual = await search(mutual, { q: `friends_${tag}` });

		assert.equal(cardsOf(seenByOneWay)[0]!.followerCount, null);
		assert.equal(cardsOf(seenByOneWay)[0]!.isFollowing, true);
		assert.equal(cardsOf(seenByMutual)[0]!.followerCount, 2);
	});

	void it("hides the sections the viewer cannot see inside a public profile", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const target = await createNamedAccount(`partial_${tag}`, "Partial");
		const platform = await createPlatform();
		await addBacklogEntry(target.user.id, platform.id, "completed", true);
		const favoriteGame = await createGame();
		await Favorite.create({
			userId: target.user.id,
			gameId: favoriteGame.id,
			position: 1
		});
		await updateVisibility(target.user, {
			backlogVisibility: "private",
			favoriteVisibility: "private"
		});

		const response = await search(viewer, { q: `partial_${tag}` });

		const [card] = cardsOf(response);
		assert.equal(card!.followerCount, 0);
		assert.equal(card!.gamesTotal, null);
		assert.equal(card!.completedTotal, null);
		assert.equal(card!.featuredGame, null);
	});

	void it("excludes deactivated accounts", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		await createUser({ username: `gone_${tag}`, isActive: false });
		const active = await createUser({ username: `gone_${tag}_on` });

		const response = await search(viewer, { q: `gone_${tag}` });

		assert.deepEqual(
			cardsOf(response).map(card => card.id),
			[active.id]
		);
	});

	void it(
		"treats percent and underscore in q as literal characters",
		{
			todo: "bug: q is interpolated into ILIKE without escaping wildcards"
		},
		async () => {
			const viewer = await createUserWithSession();
			await createUserWithSession();

			const response = await search(viewer, { q: "%" });

			assert.equal(response.status, 200);
			assert.deepEqual(cardsOf(response), []);
		}
	);

	void it("rejects a request without q or email with 422 COMMON_SCHEMA_INVALID", async () => {
		const viewer = await createUserWithSession();

		const withoutTerms = await search(viewer, {});
		const onlyLimit = await search(viewer, { limit: 5 });

		for (const response of [withoutTerms, onlyLimit]) {
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("rejects an empty q, an invalid email, an out of range limit and unknown params", async () => {
		const viewer = await createUserWithSession();
		const invalidQueries: SearchQuery[] = [
			{ q: "" },
			{ email: "not-an-email" },
			{ q: "abc", limit: 0 },
			{ q: "abc", limit: 51 },
			{ q: "abc", limit: "many" },
			{ q: "abc", offset: 1 }
		];

		for (const query of invalidQueries) {
			const response = await search(viewer, query);
			assert.equal(response.status, 422, JSON.stringify(query));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("rejects a request without a session with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await search(undefined, { q: "abc" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/users/search")
			.query({ q: "abc" })
			.set("Authorization", bearer("not-a-token"));

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /users/discover", () => {
	const DEFAULT_DISCOVER_LIMIT = 12;

	before(truncateAllTables);

	void it("lists only active public profiles for an anonymous visitor", async () => {
		const tag = uniqueTag();
		const publicUser = await createNamedAccount(`disc_${tag}`, "Public");
		const privateUser = await createNamedAccount(
			`disc_${tag}_priv`,
			"Priv"
		);
		const friendsUser = await createNamedAccount(
			`disc_${tag}_fr`,
			"Friends"
		);
		await updateVisibility(privateUser.user, {
			profileVisibility: "private"
		});
		await updateVisibility(friendsUser.user, {
			profileVisibility: "friends"
		});
		await createUser({ username: `disc_${tag}_off`, isActive: false });

		const response = await discover(undefined, { limit: 50 });

		assert.equal(response.status, 200);
		const usernames = usernamesOf(response);
		assert.ok(usernames.includes(publicUser.user.username));
		assert.ok(!usernames.includes(privateUser.user.username));
		assert.ok(!usernames.includes(friendsUser.user.username));
		assert.ok(!usernames.includes(`disc_${tag}_off`));
		assert.ok(
			cardsOf(response).every(card => card.profileVisibility === "public")
		);
	});

	void it("builds anonymous cards without self or follow state and without email", async () => {
		await createUserWithSession();

		const response = await discover(undefined, { limit: 50 });

		assert.ok(cardsOf(response).length > 0);
		for (const card of cardsOf(response)) {
			assert.equal(card.isSelf, false);
			assert.equal(card.isFollowing, false);
			assert.ok(!("email" in card));
		}
	});

	void it("excludes the caller and flags the profiles the caller follows", async () => {
		const tag = uniqueTag();
		const caller = await createNamedAccount(`caller_${tag}`, "Caller");
		const followed = await createNamedAccount(
			`followed_${tag}`,
			"Followed"
		);
		const notFollowed = await createNamedAccount(`other_${tag}`, "Other");
		await follow(caller, followed);

		const response = await discover(caller, { limit: 50 });

		assert.equal(response.status, 200);
		const cards = cardsOf(response);
		assert.ok(!cards.some(card => card.id === caller.user.id));
		const followedCard = cards.find(card => card.id === followed.user.id);
		const notFollowedCard = cards.find(
			card => card.id === notFollowed.user.id
		);
		assert.equal(followedCard!.isFollowing, true);
		assert.equal(notFollowedCard!.isFollowing, false);
	});

	void it("returns the public stats of each card", async () => {
		const tag = uniqueTag();
		const viewer = await createUserWithSession();
		const target = await createNamedAccount(`stats_${tag}`, "Stats");
		const platform = await createPlatform();
		await addBacklogEntry(target.user.id, platform.id, "completed", true);
		await addBacklogEntry(target.user.id, platform.id, "completed", false);

		const response = await discover(viewer, { limit: 50 });

		const card = cardsOf(response).find(item => item.id === target.user.id);
		assert.equal(card!.gamesTotal, 1);
		assert.equal(card!.completedTotal, 1);
		assert.equal(card!.followerCount, 0);
	});

	void it("serves 12 users by default and honors limit", async () => {
		await Promise.all(
			Array.from({ length: DEFAULT_DISCOVER_LIMIT + 3 }, () =>
				createUser()
			)
		);

		const byDefault = await discover(undefined);
		const limited = await discover(undefined, { limit: 3 });

		assert.equal(cardsOf(byDefault).length, DEFAULT_DISCOVER_LIMIT);
		assert.equal(cardsOf(limited).length, 3);
		assert.equal(
			new Set(usernamesOf(byDefault)).size,
			DEFAULT_DISCOVER_LIMIT
		);
	});

	void it("treats an invalid token as an anonymous visitor", async () => {
		const response = await api()
			.get("/users/discover")
			.set("Authorization", bearer("not-a-token"));

		assert.equal(response.status, 200);
		assert.ok(cardsOf(response).every(card => !card.isSelf));
	});

	void it("rejects an out of range limit and unknown params with 422 COMMON_SCHEMA_INVALID", async () => {
		const invalidQueries: SearchQuery[] = [
			{ limit: 0 },
			{ limit: 51 },
			{ limit: "many" },
			{ q: "abc" }
		];

		for (const query of invalidQueries) {
			const response = await discover(undefined, query);
			assert.equal(response.status, 422, JSON.stringify(query));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});
});
