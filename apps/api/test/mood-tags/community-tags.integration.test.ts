import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createGameScore,
	createGameTime,
	createScoreSource,
	createUser
} from "../helpers/factories.helper";

useTestDatabase(async () => {
	await createScoreSource({ code: "completr", scale: 5 });
});

interface GameTagBody {
	tag: string;
	players: number;
	mine: boolean;
}

interface CommunityTagBody {
	tag: string;
	games: number;
	players: number;
}

interface TaggedGameBody {
	id: string;
	code: string;
	title: string;
	coverUrl?: string | null;
	backgroundUrl?: string | null;
	ratio: number | null;
	players: number;
}

function uniqueTag(label: string) {
	return `${label}${randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

async function createVoters(count: number) {
	return Promise.all(Array.from({ length: count }, () => createUser()));
}

async function vote(userIds: string[], gameId: string, tags: string[]) {
	await UserGameTag.bulkCreate(
		userIds.flatMap(userId => tags.map(tag => ({ userId, gameId, tag })))
	);
}

function replaceGameTags(
	authorization: string,
	gameId: string,
	tags: string[]
) {
	return api()
		.put(`/users/me/games/${gameId}/mood-tags`)
		.set("Authorization", authorization)
		.send({ tags });
}

async function getGameTags(gameId: string, authorization?: string) {
	const request = api().get(`/games/${gameId}/tags`);
	if (authorization) request.set("Authorization", authorization);
	const response = await request;
	assert.equal(response.status, 200);
	return response.body.data.tags as GameTagBody[];
}

async function getPopular(limit = 50) {
	const response = await api().get(`/tags/popular?limit=${limit}`);
	assert.equal(response.status, 200);
	return response.body.data.tags as CommunityTagBody[];
}

async function searchTags(search: string, limit = 20) {
	const response = await api().get("/tags/search").query({ search, limit });
	assert.equal(response.status, 200);
	return response.body.data.tags as CommunityTagBody[];
}

async function getTagGames(tag: string, query = "") {
	const response = await api().get(
		`/tags/${encodeURIComponent(tag)}/games${query}`
	);
	assert.equal(response.status, 200);
	return response.body.data as {
		tag: string;
		total: number;
		games: TaggedGameBody[];
	};
}

function onlyTags<Item extends { tag: string }>(items: Item[], tags: string[]) {
	return items.filter(item => tags.includes(item.tag));
}

function assertNoIdentities(body: unknown, users: User[]) {
	const serialized = JSON.stringify(body);
	assert.equal(serialized.includes("userId"), false);
	assert.equal(serialized.includes("username"), false);
	for (const user of users) {
		assert.equal(serialized.includes(user.id), false);
		assert.equal(serialized.includes(user.username), false);
	}
}

void describe("GET /games/:gameId/tags", () => {
	void it("keeps a tag hidden with one player and shows it once a second player uses it", async () => {
		const game = await createGame();
		const [first, second] = await createVoters(2);
		const tag = uniqueTag("threshold");

		await vote([first!.id], game.id, [tag]);
		assert.deepEqual(await getGameTags(game.id), []);

		await vote([second!.id], game.id, [tag]);
		assert.deepEqual(await getGameTags(game.id), [
			{ tag, players: 2, mine: false }
		]);
	});

	void it("does not count deactivated accounts towards the threshold or the players", async () => {
		const game = await createGame();
		const [active, other] = await createVoters(2);
		const deactivated = await createUser({ isActive: false });
		const hidden = uniqueTag("ghost");
		const shown = uniqueTag("alive");

		await vote([active!.id, deactivated.id], game.id, [hidden]);
		await vote([active!.id, other!.id, deactivated.id], game.id, [shown]);

		assert.deepEqual(await getGameTags(game.id), [
			{ tag: shown, players: 2, mine: false }
		]);

		await User.update({ isActive: false }, { where: { id: other!.id } });
		assert.deepEqual(await getGameTags(game.id), []);
	});

	void it("never identifies who used a tag, anonymous or logged in", async () => {
		const game = await createGame();
		const viewer = await createUserWithSession();
		const voters = await createVoters(3);
		const tag = uniqueTag("anon");
		await vote(
			[...voters.map(voter => voter.id), viewer.user.id],
			game.id,
			[tag]
		);

		const anonymous = await api().get(`/games/${game.id}/tags`);
		const loggedIn = await api()
			.get(`/games/${game.id}/tags`)
			.set("Authorization", viewer.authorization);

		for (const response of [anonymous, loggedIn]) {
			assert.equal(response.status, 200);
			assertNoIdentities(response.body, [...voters, viewer.user]);
		}
	});

	void it("merges case and accent variants typed by different players into one public tag", async () => {
		const game = await createGame();
		const first = await createUserWithSession();
		const second = await createUserWithSession();
		const suffix = randomUUID().slice(0, 6);

		await replaceGameTags(first.authorization, game.id, [
			`Relajación ${suffix}`
		]).expect(200);
		await replaceGameTags(second.authorization, game.id, [
			`  RELAJACION   ${suffix.toUpperCase()} `
		]).expect(200);

		assert.deepEqual(await getGameTags(game.id), [
			{ tag: `relajacion ${suffix}`, players: 2, mine: false }
		]);
	});

	void it("orders by players and breaks ties alphabetically, capped at ten public tags", async () => {
		const game = await createGame();
		const voters = await createVoters(4);
		const ids = voters.map(voter => voter.id);
		const prefix = uniqueTag("order");
		const tied = Array.from(
			{ length: 10 },
			(_, index) => `${prefix} ${String.fromCharCode(106 - index)}`
		);
		const top = `${prefix} z-top`;

		await vote(ids, game.id, [top]);
		await vote(ids.slice(0, 2), game.id, tied);

		const tags = await getGameTags(game.id);

		assert.equal(tags.length, 10);
		assert.deepEqual(tags[0], { tag: top, players: 4, mine: false });
		assert.deepEqual(
			tags.slice(1).map(entry => entry.tag),
			[...tied].sort().slice(0, 9)
		);
		assert.ok(tags.slice(1).every(entry => entry.players === 2));
	});

	void it("flags the viewer's tags and appends their own non-public tags after the public ones", async () => {
		const game = await createGame();
		const viewer = await createUserWithSession();
		const voters = await createVoters(3);
		const ids = voters.map(voter => voter.id);
		const prefix = uniqueTag("mine");
		const sharedByViewer = `${prefix} b-shared`;
		const popular = `${prefix} a-popular`;
		const privateOnly = `${prefix} c-solo`;
		const crowded = Array.from(
			{ length: 10 },
			(_, index) => `${prefix} d-${index}`
		);
		const outsideTopTen = `${prefix} z-outside`;

		await vote(ids, game.id, [popular, ...crowded]);
		await vote(ids.slice(0, 2), game.id, [sharedByViewer, outsideTopTen]);
		await replaceGameTags(viewer.authorization, game.id, [
			sharedByViewer,
			privateOnly,
			outsideTopTen
		]).expect(200);

		const anonymous = await getGameTags(game.id);
		const loggedIn = await getGameTags(game.id, viewer.authorization);

		assert.equal(anonymous.length, 10);
		assert.ok(anonymous.every(entry => !entry.mine));
		assert.ok(!anonymous.some(entry => entry.tag === privateOnly));
		assert.equal(anonymous[1]!.tag, sharedByViewer);
		assert.deepEqual(
			loggedIn.slice(0, 10),
			anonymous.map(entry =>
				entry.tag === sharedByViewer ? { ...entry, mine: true } : entry
			)
		);
		assert.deepEqual(loggedIn.slice(10), [
			{ tag: outsideTopTen, players: 3, mine: true },
			{ tag: privateOnly, players: 1, mine: true }
		]);
	});

	void it("counts a tag sent twice in the same request once", async () => {
		const game = await createGame();
		const first = await createUserWithSession();
		const tag = uniqueTag("twice");

		await replaceGameTags(first.authorization, game.id, [
			tag,
			tag.toUpperCase(),
			` ${tag} `
		]).expect(200);

		assert.deepEqual(await getGameTags(game.id), []);
		assert.deepEqual(await getGameTags(game.id, first.authorization), [
			{ tag, players: 1, mine: true }
		]);
	});

	void it("settles on the same answer when two players tag the game at the same time", async () => {
		const game = await createGame();
		const players = await Promise.all([
			createUserWithSession(),
			createUserWithSession()
		]);
		const tag = uniqueTag("race");

		const responses = await Promise.all(
			players.flatMap(player => [
				replaceGameTags(player.authorization, game.id, [tag]),
				replaceGameTags(player.authorization, game.id, [tag])
			])
		);

		assert.deepEqual(
			responses.map(response => response.status),
			[200, 200, 200, 200]
		);
		assert.deepEqual(await getGameTags(game.id), [
			{ tag, players: 2, mine: false }
		]);
	});

	void it("answers 404 for an unknown or inactive game and 422 for a malformed id", async () => {
		const inactive = await createGame({ isActive: false });
		const [first, second] = await createVoters(2);
		await vote([first!.id, second!.id], inactive.id, [uniqueTag("off")]);

		const unknown = await api().get(`/games/${randomUUID()}/tags`);
		const hidden = await api().get(`/games/${inactive.id}/tags`);
		const malformed = await api().get("/games/not-a-uuid/tags");

		for (const response of [unknown, hidden]) {
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "MOOD_TAGS_GAME_NOT_FOUND");
		}
		assert.equal(malformed.status, 422);
		assert.equal(malformed.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("GET /tags/popular", () => {
	void it("counts public games and distinct players, ignoring one-player pairs", async () => {
		const [gameA, gameB, gameC] = await Promise.all([
			createGame(),
			createGame(),
			createGame()
		]);
		const voters = await createVoters(4);
		const [v1, v2, v3, v4] = voters.map(voter => voter.id) as [
			string,
			string,
			string,
			string
		];
		const tag = uniqueTag("popular");

		await vote([v1, v2], gameA.id, [tag]);
		await vote([v1, v3], gameB.id, [tag]);
		await vote([v4], gameC.id, [tag]);

		const [entry] = onlyTags(await getPopular(), [tag]);

		assert.deepEqual(entry, { tag, games: 2, players: 3 });
		assertNoIdentities(await getPopular(), voters);
	});

	void it("orders by games, then players, then tag", async () => {
		const games = await Promise.all([createGame(), createGame()]);
		const voters = await createVoters(3);
		const ids = voters.map(voter => voter.id);
		const prefix = uniqueTag("rank");
		const twoGames = `${prefix} c`;
		const morePlayers = `${prefix} b`;
		const tieA = `${prefix} a`;
		const tieD = `${prefix} d`;

		await vote(ids.slice(0, 2), games[0]!.id, [twoGames]);
		await vote(ids.slice(0, 2), games[1]!.id, [twoGames]);
		await vote(ids, games[0]!.id, [morePlayers]);
		await vote(ids.slice(0, 2), games[0]!.id, [tieD, tieA]);

		const ranked = onlyTags(await getPopular(), [
			twoGames,
			morePlayers,
			tieA,
			tieD
		]);

		assert.deepEqual(
			ranked.map(entry => entry.tag),
			[twoGames, morePlayers, tieA, tieD]
		);
	});

	void it("excludes inactive games and deactivated players", async () => {
		const [inactive, active] = await Promise.all([
			createGame({ isActive: false }),
			createGame()
		]);
		const [first, second] = await createVoters(2);
		const deactivated = await createUser({ isActive: false });
		const tag = uniqueTag("filtered");

		await vote([first!.id, second!.id], inactive.id, [tag]);
		await vote([first!.id, deactivated.id], active.id, [tag]);

		assert.deepEqual(onlyTags(await getPopular(), [tag]), []);
	});

	void it("validates the limit and defaults to twenty", async () => {
		for (const limit of ["0", "51", "lots", "2.5"]) {
			const response = await api().get(`/tags/popular?limit=${limit}`);
			assert.equal(response.status, 422, limit);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const unknownParam = await api().get("/tags/popular?sort=asc");
		assert.equal(unknownParam.status, 422);

		const response = await api().get("/tags/popular");
		assert.equal(response.status, 200);
		assert.ok(response.body.data.tags.length <= 20);
	});
});

void describe("GET /tags/search", () => {
	void it("matches the normalized text ignoring case and accents, only among public tags", async () => {
		const game = await createGame();
		const [first, second] = await createVoters(2);
		const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
		const publicTag = `relajacion ${suffix}`;
		const soloTag = `relajado ${suffix}`;

		await vote([first!.id, second!.id], game.id, [publicTag]);
		await vote([first!.id], game.id, [soloTag]);

		for (const search of [
			`RELAJ ${suffix}`,
			`Relajación ${suffix}`,
			suffix.toUpperCase()
		]) {
			assert.deepEqual(await searchTags(search), [
				{ tag: publicTag, games: 1, players: 2 }
			]);
		}
	});

	void it("uses the popular order and honors the limit", async () => {
		const games = await Promise.all([createGame(), createGame()]);
		const voters = await createVoters(2);
		const ids = voters.map(voter => voter.id);
		const marker = randomUUID().replaceAll("-", "").slice(0, 8);
		const wide = `${marker} b-wide`;
		const narrow = `${marker} a-narrow`;

		await vote(ids, games[0]!.id, [wide, narrow]);
		await vote(ids, games[1]!.id, [wide]);

		assert.deepEqual(
			(await searchTags(marker)).map(entry => entry.tag),
			[wide, narrow]
		);
		assert.deepEqual(
			(await searchTags(marker, 1)).map(entry => entry.tag),
			[wide]
		);
	});

	void it("answers an empty list for a search with only symbols", async () => {
		assert.deepEqual(await searchTags("%%__!!"), []);
	});

	void it("rejects a missing, empty or too long search and a bad limit", async () => {
		const responses = await Promise.all([
			api().get("/tags/search"),
			api().get("/tags/search?search="),
			api().get(`/tags/search?search=${"a".repeat(41)}`),
			api().get("/tags/search?search=cozy&limit=21"),
			api().get("/tags/search?search=cozy&limit=0")
		]);

		for (const response of responses) {
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});
});

void describe("GET /tags/:tag/games", () => {
	void it("lists only games where the tag is public, by players, title and id, with their ratio", async () => {
		const tag = uniqueTag("games");
		const [crowded, alpha, beta, solo] = await Promise.all([
			createGame({ title: "Zeta Crowded" }),
			createGame({ title: "Alpha Pair" }),
			createGame({ title: "Beta Pair" }),
			createGame({ title: "Aardvark Solo" })
		]);
		await createGameScore(alpha.id, "completr", 4);
		await createGameTime(alpha.id, "completr", 10);
		const voters = await createVoters(3);
		const ids = voters.map(voter => voter.id);

		await vote(ids, crowded.id, [tag]);
		await vote(ids.slice(0, 2), beta.id, [tag]);
		await vote(ids.slice(1), alpha.id, [tag]);
		await vote(ids.slice(0, 1), solo.id, [tag]);

		const page = await getTagGames(tag);

		assert.equal(page.tag, tag);
		assert.equal(page.total, 3);
		assert.deepEqual(
			page.games.map(game => [game.title, game.players]),
			[
				["Zeta Crowded", 3],
				["Alpha Pair", 2],
				["Beta Pair", 2]
			]
		);
		assert.equal(page.games[1]!.ratio, 8);
		assert.equal(page.games[0]!.ratio, null);
		assert.equal(page.games[1]!.code, alpha.code);
		assert.equal(page.games[1]!.id, alpha.id);
		assertNoIdentities(page, voters);
	});

	void it("breaks a title tie by id", async () => {
		const tag = uniqueTag("twin");
		const twins = await Promise.all([
			createGame({ title: "Twin" }),
			createGame({ title: "Twin" })
		]);
		const voters = await createVoters(2);
		for (const twin of twins)
			await vote(
				voters.map(voter => voter.id),
				twin.id,
				[tag]
			);

		const page = await getTagGames(tag);

		assert.deepEqual(
			page.games.map(game => game.id),
			twins.map(twin => twin.id).sort()
		);
	});

	void it("normalizes the tag in the path", async () => {
		const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
		const game = await createGame();
		const voters = await createVoters(2);
		await vote(
			voters.map(voter => voter.id),
			game.id,
			[`cafe ${suffix}`]
		);

		const page = await getTagGames(`  CAFÉ   ${suffix} `);

		assert.equal(page.tag, `cafe ${suffix}`);
		assert.equal(page.total, 1);
	});

	void it("paginates with a stable total, even past the last page", async () => {
		const tag = uniqueTag("pages");
		const games = await Promise.all(
			Array.from({ length: 5 }, (_, index) =>
				createGame({ title: `Paged ${index}` })
			)
		);
		const voters = await createVoters(2);
		for (const game of games)
			await vote(
				voters.map(voter => voter.id),
				game.id,
				[tag]
			);

		const first = await getTagGames(tag, "?limit=2");
		const second = await getTagGames(tag, "?limit=2&offset=2");
		const beyond = await getTagGames(tag, "?limit=2&offset=40");

		assert.deepEqual(
			[...first.games, ...second.games].map(game => game.title),
			["Paged 0", "Paged 1", "Paged 2", "Paged 3"]
		);
		assert.deepEqual([first.total, second.total, beyond.total], [5, 5, 5]);
		assert.deepEqual(beyond.games, []);
	});

	void it("answers an empty page for an unknown tag and leaves out inactive games and deactivated players", async () => {
		const tag = uniqueTag("lonely");
		const [inactive, active] = await Promise.all([
			createGame({ isActive: false }),
			createGame()
		]);
		const [first, second] = await createVoters(2);
		const deactivated = await createUser({ isActive: false });
		await vote([first!.id, second!.id], inactive.id, [tag]);
		await vote([first!.id, deactivated.id], active.id, [tag]);

		const unknownTag = uniqueTag("never");

		assert.deepEqual(await getTagGames(tag), { tag, total: 0, games: [] });
		assert.deepEqual(await getTagGames(unknownTag), {
			tag: unknownTag,
			total: 0,
			games: []
		});
	});

	void it("rejects a bad limit, offset or tag length", async () => {
		const responses = await Promise.all([
			api().get("/tags/cozy/games?limit=49"),
			api().get("/tags/cozy/games?limit=0"),
			api().get("/tags/cozy/games?offset=-1"),
			api().get(`/tags/${"a".repeat(41)}/games`)
		]);

		for (const response of responses) {
			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});
});
