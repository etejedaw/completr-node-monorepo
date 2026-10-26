import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import { ActivityGame } from "../../src/activity/targets/activity-game.model";
import { Backlog } from "../../src/backlog/backlog.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { type VisibilityLevel } from "../../src/users/constants/visibility.constants";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface PlatinumEntryBody {
	id: string;
	backlogId: string | null;
	platformId: string | null;
	platinumedAt: string | null;
	notes?: string | null;
	platform: { id: string; name: string; abbreviation: string } | null;
	game: { id: string; code: string; title: string };
}

interface PlatinumsBody {
	platinums: PlatinumEntryBody[];
	total: number;
}

function getUserPlatinums(
	username: string,
	authorization?: string,
	query: Record<string, unknown> = {}
) {
	const request = api().get(`/users/${username}/platinums`).query(query);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

async function listPlatinums(
	username: string,
	authorization?: string,
	query: Record<string, unknown> = {}
) {
	const response = await getUserPlatinums(
		username,
		authorization,
		query
	).expect(200);
	return response.body.data as PlatinumsBody;
}

async function createPlatinum(
	account: Account,
	fields: {
		title?: string;
		platinumedAt?: string | null;
		createdAt?: Date;
		backlogId?: string;
		platformId?: string;
		notes?: string;
	} = {}
) {
	const game = await createGame({ title: fields.title });
	const platinum = await GamePlatinum.create({
		userId: account.user.id,
		gameId: game.id,
		platinumedAt: fields.platinumedAt ?? null,
		backlogId: fields.backlogId ?? null,
		platformId: fields.platformId ?? null,
		notes: fields.notes ?? null,
		createdAt: fields.createdAt
	});
	return { game, platinum };
}

function makeMutual(first: Account, second: Account) {
	return UserFollower.bulkCreate([
		{ followerId: first.user.id, followingId: second.user.id },
		{ followerId: second.user.id, followingId: first.user.id }
	]);
}

function setVisibility(
	account: Account,
	levels: Partial<Record<string, VisibilityLevel>>
) {
	return account.user.update(levels);
}

async function createPlatinumActivity(account: Account) {
	const game = await createGame();
	const activity = await Activity.create({
		userId: account.user.id,
		type: "game_platinumed"
	});
	await ActivityGame.create({ activityId: activity.id, gameId: game.id });
	return activity;
}

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60 * 1000);
}

void describe("GET /users/:username/platinums", () => {
	void it("lists the latest platinums first, undated ones last by creation date", async () => {
		const owner = await createUserWithSession();
		const older = await createPlatinum(owner, {
			platinumedAt: "2025-01-10"
		});
		const newer = await createPlatinum(owner, {
			platinumedAt: "2026-05-02"
		});
		const undatedOld = await createPlatinum(owner, {
			createdAt: minutesAgo(60)
		});
		const undatedRecent = await createPlatinum(owner, {
			createdAt: minutesAgo(5)
		});

		const { platinums, total } = await listPlatinums(owner.user.username);

		assert.equal(total, 4);
		assert.deepEqual(
			platinums.map(entry => entry.id),
			[
				newer.platinum.id,
				older.platinum.id,
				undatedRecent.platinum.id,
				undatedOld.platinum.id
			]
		);
	});

	void it("paginates with limit and offset keeping the full total", async () => {
		const owner = await createUserWithSession();
		const dates = ["2026-03-01", "2026-02-01", "2026-01-01"];
		const created = [];
		for (const platinumedAt of dates)
			created.push(await createPlatinum(owner, { platinumedAt }));

		const { platinums, total } = await listPlatinums(
			owner.user.username,
			undefined,
			{ limit: 1, offset: 1 }
		);

		assert.equal(total, 3);
		assert.deepEqual(
			platinums.map(entry => entry.id),
			[created[1]!.platinum.id]
		);
	});

	void it("filters by game title with search", async () => {
		const owner = await createUserWithSession();
		const bloodborne = await createPlatinum(owner, { title: "Bloodborne" });
		await createPlatinum(owner, { title: "Astro Bot" });

		const { platinums, total } = await listPlatinums(
			owner.user.username,
			undefined,
			{ search: "blood" }
		);

		assert.equal(total, 1);
		assert.equal(platinums[0]!.id, bloodborne.platinum.id);
	});

	void it("serves the game and platform to visitors without notes and hides the id of a private run", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const platform = await createPlatform();
		const run = await createBacklog(owner.user.id, game.id, platform.id);
		await Backlog.update({ isPublic: false }, { where: { id: run.id } });
		const platinum = await GamePlatinum.create({
			userId: owner.user.id,
			gameId: game.id,
			backlogId: run.id,
			platformId: platform.id,
			platinumedAt: "2026-04-20",
			notes: "secret"
		});

		const { platinums } = await listPlatinums(owner.user.username);

		assert.deepEqual(platinums[0], {
			id: platinum.id,
			backlogId: null,
			platformId: platform.id,
			platinumedAt: "2026-04-20",
			platform: {
				id: platform.id,
				name: platform.name,
				abbreviation: platform.abbreviation
			},
			game: {
				id: game.id,
				code: game.code,
				title: game.title,
				backgroundUrl: null,
				isDlc: false
			}
		});
	});

	void it("serves the notes and the run id to the owner", async () => {
		const owner = await createUserWithSession();
		const game = await createGame();
		const platform = await createPlatform();
		const run = await createBacklog(owner.user.id, game.id, platform.id);
		await Backlog.update({ isPublic: false }, { where: { id: run.id } });
		await GamePlatinum.create({
			userId: owner.user.id,
			gameId: game.id,
			backlogId: run.id,
			notes: "mine"
		});

		const { platinums } = await listPlatinums(
			owner.user.username,
			owner.authorization
		);

		assert.equal(platinums[0]!.notes, "mine");
		assert.equal(platinums[0]!.backlogId, run.id);
	});

	void it("returns an empty page for a user without platinums", async () => {
		const owner = await createUserWithSession();

		assert.deepEqual(await listPlatinums(owner.user.username), {
			platinums: [],
			total: 0
		});
	});

	void it("answers 404 USER_NOT_FOUND for a username that does not exist", async () => {
		const response = await getUserPlatinums("nobody_here");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for a limit over 100", async () => {
		const owner = await createUserWithSession();

		const response = await getUserPlatinums(
			owner.user.username,
			undefined,
			{
				limit: 101
			}
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("platinumVisibility", () => {
	void it("hides the platinums from a stranger when they are for friends and shows them to a mutual follower", async () => {
		const owner = await createUserWithSession();
		await createPlatinum(owner);
		await setVisibility(owner, { platinumVisibility: "friends" });
		const stranger = await createUserWithSession();
		const friend = await createUserWithSession();
		await makeMutual(owner, friend);

		const anonymous = await getUserPlatinums(owner.user.username);
		const forStranger = await getUserPlatinums(
			owner.user.username,
			stranger.authorization
		);
		const forFriend = await listPlatinums(
			owner.user.username,
			friend.authorization
		);

		assert.equal(anonymous.status, 403);
		assert.equal(anonymous.body.type, "USER_PRIVATE");
		assert.equal(forStranger.status, 403);
		assert.equal(forFriend.total, 1);
	});

	void it("hides private platinums from everyone but the owner", async () => {
		const owner = await createUserWithSession();
		await createPlatinum(owner);
		await setVisibility(owner, { platinumVisibility: "private" });
		const friend = await createUserWithSession();
		await makeMutual(owner, friend);

		const forFriend = await getUserPlatinums(
			owner.user.username,
			friend.authorization
		);
		const forOwner = await listPlatinums(
			owner.user.username,
			owner.authorization
		);

		assert.equal(forFriend.status, 403);
		assert.equal(forOwner.total, 1);
	});

	void it("answers 403 USER_PRIVATE when the profile is private even with public platinums", async () => {
		const owner = await createUserWithSession();
		await createPlatinum(owner);
		await setVisibility(owner, {
			profileVisibility: "private",
			platinumVisibility: "public"
		});

		const response = await getUserPlatinums(owner.user.username);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "USER_PRIVATE");
	});

	void it("can be updated with PATCH /users/me and is returned by GET /users/me", async () => {
		const owner = await createUserWithSession();

		await api()
			.patch("/users/me")
			.set("Authorization", owner.authorization)
			.send({ platinumVisibility: "friends" })
			.expect(200);
		const me = await api()
			.get("/users/me")
			.set("Authorization", owner.authorization)
			.expect(200);

		assert.equal(me.body.data.user.platinumVisibility, "friends");
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for an unknown level", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch("/users/me")
			.set("Authorization", owner.authorization)
			.send({ platinumVisibility: "everyone" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("exposes the platinum access in the public profile", async () => {
		const owner = await createUserWithSession();
		await setVisibility(owner, { platinumVisibility: "private" });

		const response = await api()
			.get(`/users/${owner.user.username}`)
			.expect(200);

		assert.equal(response.body.data.access.platinum, false);
	});
});

void describe("platinumVisibility in the public backlog", () => {
	async function createOwnerWithPlatinumRun() {
		const owner = await createUserWithSession();
		const game = await createGame();
		const plainGame = await createGame();
		const platform = await createPlatform();
		const run = await createBacklog(owner.user.id, game.id, platform.id);
		const plainRun = await createBacklog(
			owner.user.id,
			plainGame.id,
			platform.id
		);
		await GamePlatinum.create({
			userId: owner.user.id,
			gameId: game.id,
			backlogId: run.id
		});
		return { owner, run, plainRun };
	}

	void it("serves null platinums and ignores platinumed_only when the platinums are hidden", async () => {
		const { owner, run, plainRun } = await createOwnerWithPlatinumRun();
		await setVisibility(owner, { platinumVisibility: "private" });

		const response = await api()
			.get(`/users/${owner.user.username}/backlog`)
			.query({ platinumed_only: "true" })
			.expect(200);

		const entries = response.body.data.backlog as {
			id: string;
			platinum: unknown;
		}[];
		assert.deepEqual(
			entries.map(entry => entry.id).sort(),
			[run.id, plainRun.id].sort()
		);
		assert.ok(entries.every(entry => entry.platinum === null));
	});

	void it("keeps the platinums in the backlog of the owner", async () => {
		const { owner, run } = await createOwnerWithPlatinumRun();
		await setVisibility(owner, { platinumVisibility: "private" });

		const response = await api()
			.get(`/users/${owner.user.username}/backlog`)
			.query({ platinumed_only: "true" })
			.set("Authorization", owner.authorization)
			.expect(200);

		const entries = response.body.data.backlog as {
			id: string;
			platinum: { backlogId: string } | null;
		}[];
		assert.deepEqual(
			entries.map(entry => entry.id),
			[run.id]
		);
		assert.equal(entries[0]!.platinum?.backlogId, run.id);
	});
});

void describe("platinumVisibility in activity", () => {
	async function getFeed(account: Account) {
		const response = await api()
			.get("/feed")
			.set("Authorization", account.authorization)
			.expect(200);
		return response.body.data as {
			activities: { id: string }[];
			total: number;
		};
	}

	void it("drops game_platinumed from the feed of followers when the platinums are private", async () => {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		await UserFollower.create({
			followerId: follower.user.id,
			followingId: owner.user.id
		});
		await createPlatinumActivity(owner);
		const otherActivity = await Activity.create({
			userId: owner.user.id,
			type: "backlog_added"
		});
		await setVisibility(owner, { platinumVisibility: "private" });

		const feed = await getFeed(follower);

		assert.deepEqual(
			feed.activities.map(activity => activity.id),
			[otherActivity.id]
		);
		assert.equal(feed.total, 1);
	});

	void it("shows game_platinumed for friends only to mutual followers", async () => {
		const owner = await createUserWithSession();
		const follower = await createUserWithSession();
		const friend = await createUserWithSession();
		await UserFollower.create({
			followerId: follower.user.id,
			followingId: owner.user.id
		});
		await makeMutual(owner, friend);
		const platinumActivity = await createPlatinumActivity(owner);
		await setVisibility(owner, { platinumVisibility: "friends" });

		const forFollower = await getFeed(follower);
		const forFriend = await getFeed(friend);

		assert.equal(forFollower.total, 0);
		assert.deepEqual(
			forFriend.activities.map(activity => activity.id),
			[platinumActivity.id]
		);
	});

	void it("keeps the own game_platinumed in the feed of the owner", async () => {
		const owner = await createUserWithSession();
		const platinumActivity = await createPlatinumActivity(owner);
		await setVisibility(owner, { platinumVisibility: "private" });

		const feed = await getFeed(owner);

		assert.deepEqual(
			feed.activities.map(activity => activity.id),
			[platinumActivity.id]
		);
	});

	void it("drops game_platinumed from the recent activity of the profile for visitors only", async () => {
		const owner = await createUserWithSession();
		await createPlatinumActivity(owner);
		await Activity.create({ userId: owner.user.id, type: "backlog_added" });
		await setVisibility(owner, { platinumVisibility: "private" });

		const forVisitor = await api()
			.get(`/users/${owner.user.username}`)
			.expect(200);
		const forOwner = await api()
			.get(`/users/${owner.user.username}`)
			.set("Authorization", owner.authorization)
			.expect(200);

		const visitorTypes = (
			forVisitor.body.data.recentActivity as { type: string }[]
		).map(activity => activity.type);
		const ownerTypes = (
			forOwner.body.data.recentActivity as { type: string }[]
		).map(activity => activity.type);
		assert.deepEqual(visitorTypes, ["backlog_added"]);
		assert.ok(ownerTypes.includes("game_platinumed"));
	});
});
