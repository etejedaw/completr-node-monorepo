import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Favorite } from "../../src/favorites/favorite.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { Queue } from "../../src/queue/queue.model";
import { api } from "../helpers/app.helper";
import { type Account, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createWishlistEntries
} from "../helpers/factories.helper";

useTestDatabase();

interface TaggedList {
	name: string;
	path: string;
	dataKey: string;
	titleOf: (entry: EntryWithGame) => string;
	add: (userId: string, gameIds: string[]) => Promise<unknown>;
}

interface EntryWithGame {
	game?: { title: string };
	backlog?: { game: { title: string } };
}

type Query = Record<string, string | string[]>;

const gameTitle = (entry: EntryWithGame) => entry.game!.title;

const TAGGED_LISTS: TaggedList[] = [
	{
		name: "Up Next",
		path: "/users/me/queue",
		dataKey: "queue",
		titleOf: entry => entry.backlog!.game.title,
		add: async (userId, gameIds) => {
			const platform = await createPlatform();
			const backlogs = await Promise.all(
				gameIds.map(gameId =>
					createBacklog(userId, gameId, platform.id)
				)
			);
			return Queue.bulkCreate(
				backlogs.map((backlog, index) => ({
					userId,
					backlogId: backlog.id,
					position: index + 1
				}))
			);
		}
	},
	{
		name: "My Shelf",
		path: "/users/me/game-shelf",
		dataKey: "gameShelf",
		titleOf: gameTitle,
		add: async (userId, gameIds) => {
			const platform = await createPlatform();
			return GameShelf.bulkCreate(
				gameIds.map(gameId => ({
					userId,
					gameId,
					platformId: platform.id
				}))
			);
		}
	},
	{
		name: "Want to Get",
		path: "/users/me/wishlist",
		dataKey: "wishlist",
		titleOf: gameTitle,
		add: (userId, gameIds) => createWishlistEntries(userId, gameIds)
	},
	{
		name: "Favorites",
		path: "/users/me/favorites",
		dataKey: "favorites",
		titleOf: gameTitle,
		add: (userId, gameIds) =>
			Favorite.bulkCreate(
				gameIds.map((gameId, index) => ({
					userId,
					gameId,
					position: index + 1
				}))
			)
	},
	{
		name: "Platinums",
		path: "/users/me/platinums",
		dataKey: "platinums",
		titleOf: gameTitle,
		add: (userId, gameIds) =>
			GamePlatinum.bulkCreate(
				gameIds.map((gameId, index) => ({
					userId,
					gameId,
					platinumedAt: `2026-01-${String(index + 1).padStart(2, "0")}`
				}))
			)
	}
];

function tagGame(account: Account, gameId: string, tags: string[]) {
	return api()
		.put(`/users/me/games/${gameId}/mood-tags`)
		.set("Authorization", account.authorization)
		.send({ tags })
		.expect(200);
}

async function seedTaggedList(list: TaggedList) {
	const [owner, stranger] = await Promise.all([
		createUserWithSession("premium"),
		createUserWithSession()
	]);
	const keyword = `kw${randomUUID().slice(0, 8)}`;
	const [cozyRpg, cozy, rpg, strangerTagged] = await Promise.all([
		createGame({ title: `${keyword} Cozy RPG` }),
		createGame({ title: `${keyword} Cozy` }),
		createGame({ title: `${keyword} RPG` }),
		createGame({ title: `${keyword} Stranger` })
	]);
	await list.add(owner.user.id, [
		cozyRpg.id,
		cozy.id,
		rpg.id,
		strangerTagged.id
	]);
	await Promise.all([
		tagGame(owner, cozyRpg.id, ["Cozy", "RPG"]),
		tagGame(owner, cozy.id, ["cozy"]),
		tagGame(owner, rpg.id, ["rpg"]),
		tagGame(stranger, strangerTagged.id, ["cozy", "rpg", "souls"]),
		tagGame(stranger, cozy.id, ["rpg"])
	]);
	return {
		owner,
		keyword,
		titles: {
			cozyRpg: cozyRpg.title,
			cozy: cozy.title,
			rpg: rpg.title
		}
	};
}

function listRequest(list: TaggedList, owner: Account, query: Query) {
	return api()
		.get(list.path)
		.set("Authorization", owner.authorization)
		.query(query);
}

function exportRequest(list: TaggedList, owner: Account, query: Query) {
	return api()
		.get(`${list.path}/export`)
		.set("Authorization", owner.authorization)
		.set("Accept", "application/json")
		.query(query);
}

async function listTitles(list: TaggedList, owner: Account, query: Query) {
	const response = await listRequest(list, owner, query);
	assert.equal(response.status, 200, JSON.stringify(response.body));
	const entries = response.body.data[list.dataKey] as EntryWithGame[];
	return {
		titles: entries.map(list.titleOf),
		total: response.body.data.total as number
	};
}

async function exportTitles(list: TaggedList, owner: Account, query: Query) {
	const response = await exportRequest(list, owner, query);
	assert.equal(response.status, 200, JSON.stringify(response.body));
	return (response.body as { gameTitle: string }[])
		.map(row => row.gameTitle)
		.sort();
}

function sorted(titles: string[]) {
	return [...titles].sort();
}

function elevenTags() {
	return Array.from({ length: 11 }, (_, index) => `tag${index}`).join(",");
}

const INVALID_MOOD_TAGS: { label: string; value: string | string[] }[] = [
	{ label: "eleven distinct tags", value: elevenTags() },
	{ label: "an empty list", value: "" },
	{ label: "only separators", value: ",,," },
	{ label: "only blank tags", value: " ,  , " },
	{ label: "the param repeated", value: ["cozy", "rpg"] }
];

for (const list of TAGGED_LISTS) {
	void describe(`${list.name} filtered by mood_tags`, () => {
		void it("keeps only the entries whose game has the tag", async () => {
			const { owner, keyword, titles } = await seedTaggedList(list);

			const result = await listTitles(list, owner, {
				mood_tags: "cozy",
				search: keyword
			});

			assert.deepEqual(
				sorted(result.titles),
				sorted([titles.cozyRpg, titles.cozy])
			);
			assert.equal(result.total, 2);
		});

		void it("requires every tag when two are given", async () => {
			const { owner, titles } = await seedTaggedList(list);

			const result = await listTitles(list, owner, {
				mood_tags: "cozy,rpg"
			});

			assert.deepEqual(result.titles, [titles.cozyRpg]);
			assert.equal(result.total, 1);
		});

		void it("ignores the tags other users put on the same games", async () => {
			const { owner } = await seedTaggedList(list);

			const result = await listTitles(list, owner, {
				mood_tags: "souls"
			});

			assert.deepEqual(result.titles, []);
			assert.equal(result.total, 0);
		});

		void it("normalizes case, accents, spaces, duplicates and empty items", async () => {
			const { owner, titles } = await seedTaggedList(list);

			const result = await listTitles(list, owner, {
				mood_tags: "  CÓZY ,Rpg,,cozy, rpg  ,"
			});

			assert.deepEqual(result.titles, [titles.cozyRpg]);
		});

		void it("accepts eleven items that collapse into ten distinct tags", async () => {
			const { owner } = await seedTaggedList(list);
			const tags = Array.from({ length: 10 }, (_, index) => `t${index}`);

			const result = await listTitles(list, owner, {
				mood_tags: [...tags, "T0"].join(",")
			});

			assert.deepEqual(result.titles, []);
		});

		for (const invalid of INVALID_MOOD_TAGS) {
			void it(`responds 422 COMMON_SCHEMA_INVALID for ${invalid.label}`, async () => {
				const { owner } = await seedTaggedList(list);

				const response = await listRequest(list, owner, {
					mood_tags: invalid.value
				});

				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			});
		}

		void it("combines the tags with the title search", async () => {
			const { owner, keyword, titles } = await seedTaggedList(list);

			const result = await listTitles(list, owner, {
				mood_tags: "rpg",
				search: `${keyword} cozy`
			});

			assert.deepEqual(result.titles, [titles.cozyRpg]);
			assert.equal(result.total, 1);
		});

		void it("paginates over the filtered entries with the filtered total", async () => {
			const { owner, titles } = await seedTaggedList(list);
			const query = { mood_tags: "cozy", limit: "1" };

			const [first, second, beyond] = await Promise.all([
				listTitles(list, owner, { ...query, offset: "0" }),
				listTitles(list, owner, { ...query, offset: "1" }),
				listTitles(list, owner, { ...query, offset: "2" })
			]);

			assert.equal(first.titles.length, 1);
			assert.equal(second.titles.length, 1);
			assert.deepEqual(beyond.titles, []);
			assert.deepEqual(
				[first.total, second.total, beyond.total],
				[2, 2, 2]
			);
			assert.deepEqual(
				sorted([...first.titles, ...second.titles]),
				sorted([titles.cozyRpg, titles.cozy])
			);
		});

		void it("answers repeated concurrent requests with the same page", async () => {
			const { owner } = await seedTaggedList(list);
			const query = { mood_tags: "cozy,rpg" };

			const results = await Promise.all(
				Array.from({ length: 4 }, () => listTitles(list, owner, query))
			);

			for (const result of results) assert.deepEqual(result, results[0]);
		});

		void it("filters the export by every tag and the search", async () => {
			const { owner, keyword, titles } = await seedTaggedList(list);

			const [byTag, byBothTags, withSearch] = await Promise.all([
				exportTitles(list, owner, { mood_tags: "cozy" }),
				exportTitles(list, owner, { mood_tags: "Cozy, RPG" }),
				exportTitles(list, owner, {
					mood_tags: "cozy",
					search: `${keyword} rpg`
				})
			]);

			assert.deepEqual(byTag, sorted([titles.cozyRpg, titles.cozy]));
			assert.deepEqual(byBothTags, [titles.cozyRpg]);
			assert.deepEqual(withSearch, [titles.cozyRpg]);
		});

		void it("rejects an export with eleven tags or an empty list", async () => {
			const { owner } = await seedTaggedList(list);

			const responses = await Promise.all([
				exportRequest(list, owner, { mood_tags: elevenTags() }),
				exportRequest(list, owner, { mood_tags: "" })
			]);

			for (const response of responses) {
				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			}
		});

		void it("returns every entry when mood_tags is absent", async () => {
			const { owner, keyword } = await seedTaggedList(list);

			const result = await listTitles(list, owner, { search: keyword });

			assert.equal(result.total, 4);
		});
	});
}
