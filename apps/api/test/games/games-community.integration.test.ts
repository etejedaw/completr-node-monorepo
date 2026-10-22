import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { type Game } from "../../src/games/game.model";
import { ListItem } from "../../src/list-items/list-item.model";
import { type Platform } from "../../src/platforms/platform.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { type VisibilityLevel } from "../../src/users/constants/visibility.constants";
import { type User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createList,
	createPlatform,
	createScoreSource,
	createUser
} from "../helpers/factories.helper";

const PLAYERS_LIMIT = 10;
const SECRET_NOTES = "secret playthrough notes";

let platform: Platform;
let scoreSource: string;

useTestDatabase(async () => {
	scoreSource = (await createScoreSource()).code;
	platform = await createPlatform();
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface RunOverrides {
	status?: BacklogStatus;
	isPublic?: boolean;
	createdAt?: string;
	finishedAt?: string;
	userRating?: number;
	notes?: string;
}

interface Visibilities {
	profileVisibility?: VisibilityLevel;
	backlogVisibility?: VisibilityLevel;
	listVisibility?: VisibilityLevel;
}

function createRun(user: User, game: Game, overrides: RunOverrides = {}) {
	return Backlog.create({
		userId: user.id,
		gameId: game.id,
		platformId: platform.id,
		status: overrides.status ?? "playing",
		isPublic: overrides.isPublic ?? true,
		createdAt: overrides.createdAt,
		finishedAt: overrides.finishedAt,
		userRating: overrides.userRating,
		notes: overrides.notes,
		score: 4,
		duration: 10
	});
}

async function createPlayer(
	game: Game,
	visibilities: Visibilities = {},
	run: RunOverrides = {}
) {
	const user = await createUser();
	await user.update(visibilities);
	await createRun(user, game, run);
	return user;
}

function follow(follower: User, target: User) {
	return UserFollower.create({
		followerId: follower.id,
		followingId: target.id
	});
}

function unfollow(follower: User, target: User) {
	return UserFollower.destroy({
		where: { followerId: follower.id, followingId: target.id }
	});
}

function getFor(path: string, account: Account, gameId: string) {
	return api()
		.get(`/games/${gameId}/${path}`)
		.set("Authorization", account.authorization);
}

function usernamesOf(
	body: { data: Record<string, { username: string }[]> },
	key: string
) {
	return body.data[key]!.map(entry => entry.username).sort();
}

void describe("GET /games/:id/lists", () => {
	void it("returns the public lists that contain the game with their summary", async () => {
		const viewer = await createUserWithSession();
		const owner = await createUserWithSession();
		const game = await createGame();
		const list = await createList(owner.user.id, scoreSource, {
			name: "Cozy picks",
			isPublic: true
		});
		await list.update({ description: "Relaxing games" });
		await ListItem.create({
			listId: list.id,
			gameId: game.id,
			position: 1
		});

		const response = await getFor("lists", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.lists, [
			{
				id: list.id,
				name: "Cozy picks",
				description: "Relaxing games",
				isOfficial: false,
				owner: { username: owner.user.username },
				completed: false
			}
		]);
		assert.deepEqual(response.body.data.myLists, []);
	});

	void it("never exposes the private lists of other users", async () => {
		const viewer = await createUserWithSession();
		const owner = await createUserWithSession();
		const game = await createGame();
		const privateList = await createList(owner.user.id, scoreSource, {
			name: "Hidden shame",
			isPublic: false
		});
		await ListItem.create({
			listId: privateList.id,
			gameId: game.id,
			position: 1
		});

		const response = await getFor("lists", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.lists, []);
		assert.deepEqual(response.body.data.myLists, []);
		assert.equal(
			JSON.stringify(response.body).includes("Hidden shame"),
			false
		);
		assert.equal(
			JSON.stringify(response.body).includes(owner.user.username),
			false
		);
	});

	void it("leaves out the lists whose owner hides them by profile or lists section", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const hiddenOwners: Visibilities[] = [
			{ profileVisibility: "private" },
			{ profileVisibility: "friends" },
			{ listVisibility: "private" },
			{ listVisibility: "friends" }
		];
		const shownOwner = await createUser();
		const shownList = await createList(shownOwner.id, scoreSource, {
			isPublic: true
		});
		await ListItem.create({
			listId: shownList.id,
			gameId: game.id,
			position: 1
		});
		for (const visibilities of hiddenOwners) {
			const owner = await createUser();
			await owner.update(visibilities);
			const list = await createList(owner.id, scoreSource, {
				isPublic: true
			});
			await ListItem.create({
				listId: list.id,
				gameId: game.id,
				position: 1
			});
		}

		const response = await getFor("lists", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.lists.map((entry: { id: string }) => entry.id),
			[shownList.id]
		);
	});

	void it("shows a friends-only lists section to a mutual follower and keeps the viewer's own lists in myLists", async () => {
		const viewer = await createUserWithSession();
		const friend = await createUser();
		await friend.update({
			profileVisibility: "friends",
			listVisibility: "friends"
		});
		await follow(viewer.user, friend);
		await follow(friend, viewer.user);
		const game = await createGame();
		const friendList = await createList(friend.id, scoreSource, {
			isPublic: true
		});
		const ownPrivate = await createList(viewer.user.id, scoreSource, {
			isPublic: false
		});
		for (const list of [friendList, ownPrivate])
			await ListItem.create({
				listId: list.id,
				gameId: game.id,
				position: 1
			});

		const response = await getFor("lists", viewer, game.id);

		assert.deepEqual(
			response.body.data.lists.map((entry: { id: string }) => entry.id),
			[friendList.id]
		);
		assert.deepEqual(
			response.body.data.myLists.map((entry: { id: string }) => entry.id),
			[ownPrivate.id]
		);
	});

	void it("returns all of the viewer's own lists flagged by whether they contain the game, private ones included", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const containing = await createList(viewer.user.id, scoreSource, {
			name: "Private with game",
			isPublic: false
		});
		const publicContaining = await createList(viewer.user.id, scoreSource, {
			name: "Public with game",
			isPublic: true
		});
		const empty = await createList(viewer.user.id, scoreSource, {
			name: "Without game",
			isPublic: true
		});
		await ListItem.create({
			listId: containing.id,
			gameId: game.id,
			position: 1
		});
		await ListItem.create({
			listId: publicContaining.id,
			gameId: game.id,
			position: 1
		});

		const response = await getFor("lists", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(
			response.body.data.lists.map((entry: { id: string }) => entry.id),
			[publicContaining.id]
		);
		const myLists = response.body.data.myLists as {
			id: string;
			name: string;
			isPublic: boolean;
			contains: boolean;
		}[];
		assert.equal(myLists.length, 3);
		const byId = new Map(myLists.map(entry => [entry.id, entry]));
		assert.deepEqual(byId.get(containing.id), {
			id: containing.id,
			name: "Private with game",
			isPublic: false,
			contains: true
		});
		assert.equal(byId.get(publicContaining.id)!.contains, true);
		assert.equal(byId.get(empty.id)!.contains, false);
	});

	void it("does not include the lists of other users in myLists", async () => {
		const viewer = await createUserWithSession();
		const owner = await createUserWithSession();
		const game = await createGame();
		const othersList = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});
		await ListItem.create({
			listId: othersList.id,
			gameId: game.id,
			position: 1
		});

		const response = await getFor("lists", viewer, game.id);

		assert.equal(response.body.data.lists.length, 1);
		assert.deepEqual(response.body.data.myLists, []);
	});

	void it("leaves out the lists that do not contain the game", async () => {
		const viewer = await createUserWithSession();
		const owner = await createUserWithSession();
		const game = await createGame();
		const otherGame = await createGame();
		const list = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});
		await ListItem.create({
			listId: list.id,
			gameId: otherGame.id,
			position: 1
		});

		const response = await getFor("lists", viewer, game.id);

		assert.deepEqual(response.body.data.lists, []);
	});

	void it("marks official lists, puts them first and reports the viewer's completion", async () => {
		const viewer = await createUserWithSession();
		const admin = await createUser({ role: "admin" });
		const member = await createUser();
		const game = await createGame();
		const sibling = await createGame();
		const officialList = await createList(admin.id, scoreSource, {
			name: "Official picks",
			isPublic: true
		});
		const communityList = await createList(member.id, scoreSource, {
			name: "Community picks",
			isPublic: true
		});
		for (const list of [officialList, communityList]) {
			await ListItem.create({
				listId: list.id,
				gameId: game.id,
				position: 1
			});
		}
		await ListItem.create({
			listId: communityList.id,
			gameId: sibling.id,
			position: 2
		});
		await createRun(viewer.user, game, { status: "completed" });

		const response = await getFor("lists", viewer, game.id);

		const lists = response.body.data.lists as {
			name: string;
			isOfficial: boolean;
			completed: boolean;
		}[];
		assert.deepEqual(
			lists.map(entry => [entry.name, entry.isOfficial, entry.completed]),
			[
				["Official picks", true, true],
				["Community picks", false, false]
			]
		);
	});

	void it("stops listing a list once it becomes private", async () => {
		const viewer = await createUserWithSession();
		const owner = await createUserWithSession();
		const game = await createGame();
		const list = await createList(owner.user.id, scoreSource, {
			isPublic: true
		});
		await ListItem.create({
			listId: list.id,
			gameId: game.id,
			position: 1
		});

		const before = await getFor("lists", viewer, game.id);
		await list.update({ isPublic: false });
		const after = await getFor("lists", viewer, game.id);

		assert.equal(before.body.data.lists.length, 1);
		assert.deepEqual(after.body.data.lists, []);
	});

	void it("returns empty lists for a game that does not exist", async () => {
		const viewer = await createUserWithSession();

		const response = await getFor("lists", viewer, randomUUID());

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.lists, []);
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const viewer = await createUserWithSession();

		const response = await getFor("lists", viewer, "not-a-uuid");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(`/games/${randomUUID()}/lists`);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(`/games/${randomUUID()}/lists`)
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /games/:id/friends-activity", () => {
	void it("returns nothing when the viewer follows nobody", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await createPlayer(game);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { friends: [] });
	});

	void it("returns the public run of every followed user with only the public fields", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const friend = await createPlayer(
			game,
			{},
			{
				status: "completed",
				finishedAt: "2025-05-20",
				userRating: 4.5,
				notes: SECRET_NOTES
			}
		);
		await follow(viewer.user, friend);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.friends, [
			{
				username: friend.username,
				name: friend.name,
				avatarUrl: null,
				role: "user",
				status: "completed",
				finishedAt: "2025-05-20",
				userRating: 4.5
			}
		]);
		const serialized = JSON.stringify(response.body);
		assert.equal(serialized.includes(SECRET_NOTES), false);
		assert.equal(serialized.includes(friend.email), false);
	});

	void it("ignores users the viewer does not follow, including users that follow the viewer", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await createPlayer(game);
		const follower = await createPlayer(game);
		await follow(follower, viewer.user);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(response.body.data.friends, []);
	});

	void it("shows the most recent run once per friend and only for the requested game", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const otherGame = await createGame();
		const friend = await createPlayer(
			game,
			{},
			{
				status: "abandoned",
				createdAt: "2024-01-01T00:00:00Z"
			}
		);
		await createRun(friend, game, {
			status: "completed",
			createdAt: "2025-01-01T00:00:00Z"
		});
		await createRun(friend, otherGame, { status: "playing" });
		await follow(viewer.user, friend);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.equal(response.body.data.friends.length, 1);
		assert.equal(response.body.data.friends[0].status, "completed");
	});

	void it("hides runs marked as private", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const friend = await createPlayer(game, {}, { isPublic: false });
		await follow(viewer.user, friend);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(response.body.data.friends, []);
	});

	void it("hides friends whose backlog or profile is private", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const privateBacklog = await createPlayer(game, {
			backlogVisibility: "private"
		});
		const privateProfile = await createPlayer(game, {
			profileVisibility: "private"
		});
		await follow(viewer.user, privateBacklog);
		await follow(viewer.user, privateProfile);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(response.body.data.friends, []);
	});

	void it("shows a friends-only backlog once the follow is mutual", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const friend = await createPlayer(game, {
			backlogVisibility: "friends"
		});
		await follow(viewer.user, friend);
		await follow(friend, viewer.user);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(usernamesOf(response.body, "friends"), [
			friend.username
		]);
	});

	void it("hides a friends-only backlog from a viewer that follows without being followed back", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const friend = await createPlayer(game, {
			backlogVisibility: "friends"
		});
		await follow(viewer.user, friend);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(response.body.data.friends, []);
	});

	void it("hides a friends-only profile from a viewer that follows without being followed back", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const friend = await createPlayer(game, {
			profileVisibility: "friends"
		});
		await follow(viewer.user, friend);

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(response.body.data.friends, []);
	});

	void it("hides followed users whose account is deactivated", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const active = await createPlayer(game);
		const deactivated = await createPlayer(game);
		await follow(viewer.user, active);
		await follow(viewer.user, deactivated);
		await deactivated.update({ isActive: false });

		const response = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(usernamesOf(response.body, "friends"), [
			active.username
		]);
	});

	void it("follows the follow graph: a new follow appears and an unfollow disappears", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const friend = await createPlayer(game);

		const before = await getFor("friends-activity", viewer, game.id);
		await follow(viewer.user, friend);
		const followed = await getFor("friends-activity", viewer, game.id);
		await unfollow(viewer.user, friend);
		const unfollowed = await getFor("friends-activity", viewer, game.id);

		assert.deepEqual(before.body.data.friends, []);
		assert.deepEqual(usernamesOf(followed.body, "friends"), [
			friend.username
		]);
		assert.deepEqual(unfollowed.body.data.friends, []);
	});

	void it("returns an empty list for a game that does not exist", async () => {
		const viewer = await createUserWithSession();
		const friend = await createUser();
		await follow(viewer.user, friend);

		const response = await getFor("friends-activity", viewer, randomUUID());

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { friends: [] });
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const viewer = await createUserWithSession();

		const response = await getFor("friends-activity", viewer, "not-a-uuid");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(
			`/games/${randomUUID()}/friends-activity`
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(`/games/${randomUUID()}/friends-activity`)
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /games/:id/players", () => {
	void it("returns the public runs of other users with only the public fields", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const player = await createPlayer(
			game,
			{},
			{
				status: "playing",
				finishedAt: "2025-05-20",
				userRating: 3,
				notes: SECRET_NOTES
			}
		);

		const response = await getFor("players", viewer, game.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.players, [
			{
				username: player.username,
				name: player.name,
				avatarUrl: null,
				role: "user",
				status: "playing"
			}
		]);
		const serialized = JSON.stringify(response.body);
		assert.equal(serialized.includes(SECRET_NOTES), false);
		assert.equal(serialized.includes(player.email), false);
	});

	void it("excludes the viewer and the users the viewer follows", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await createRun(viewer.user, game);
		const friend = await createPlayer(game);
		const stranger = await createPlayer(game);
		await follow(viewer.user, friend);

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(usernamesOf(response.body, "players"), [
			stranger.username
		]);
	});

	void it("still lists a user that only follows the viewer", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const follower = await createPlayer(game);
		await follow(follower, viewer.user);

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(usernamesOf(response.body, "players"), [
			follower.username
		]);
	});

	void it("lists each player once even with several runs, and only for the requested game", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const otherGame = await createGame();
		const player = await createPlayer(game);
		await createRun(player, game, { status: "completed" });
		await createPlayer(otherGame);

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(usernamesOf(response.body, "players"), [
			player.username
		]);
	});

	void it("hides private runs and players whose backlog or profile is private", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await createPlayer(game, {}, { isPublic: false });
		await createPlayer(game, { backlogVisibility: "private" });
		await createPlayer(game, { profileVisibility: "private" });

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(response.body.data.players, []);
	});

	void it("hides friends-only backlogs from users that are not friends of the viewer", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await createPlayer(game, { backlogVisibility: "friends" });

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(response.body.data.players, []);
	});

	void it("hides friends-only profiles from users that are not friends of the viewer", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await createPlayer(game, { profileVisibility: "friends" });

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(response.body.data.players, []);
	});

	void it("caps the result at ten distinct players", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		await Promise.all(
			Array.from({ length: PLAYERS_LIMIT + 3 }, () => createPlayer(game))
		);

		const response = await getFor("players", viewer, game.id);

		const usernames = response.body.data.players.map(
			(entry: { username: string }) => entry.username
		);
		assert.equal(usernames.length, PLAYERS_LIMIT);
		assert.equal(new Set(usernames).size, PLAYERS_LIMIT);
	});

	void it("hides players whose account is deactivated", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const active = await createPlayer(game);
		const deactivated = await createPlayer(game);
		await deactivated.update({ isActive: false });

		const response = await getFor("players", viewer, game.id);

		assert.deepEqual(usernamesOf(response.body, "players"), [
			active.username
		]);
	});

	void it("reflects a run that becomes private", async () => {
		const viewer = await createUserWithSession();
		const game = await createGame();
		const player = await createUser();
		const run = await createRun(player, game);

		const before = await getFor("players", viewer, game.id);
		await run.update({ isPublic: false });
		const after = await getFor("players", viewer, game.id);

		assert.deepEqual(usernamesOf(before.body, "players"), [
			player.username
		]);
		assert.deepEqual(after.body.data.players, []);
	});

	void it("returns an empty list for a game that does not exist", async () => {
		const viewer = await createUserWithSession();

		const response = await getFor("players", viewer, randomUUID());

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data, { players: [] });
	});

	void it("rejects a malformed game id with 422 COMMON_SCHEMA_INVALID", async () => {
		const viewer = await createUserWithSession();

		const response = await getFor("players", viewer, "not-a-uuid");

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(`/games/${randomUUID()}/players`);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(`/games/${randomUUID()}/players`)
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
