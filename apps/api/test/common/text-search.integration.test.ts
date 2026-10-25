import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Favorite } from "../../src/favorites/favorite.model";
import { Queue } from "../../src/queue/queue.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { type User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createFranchise,
	createGame,
	createList,
	createPlatform,
	createSavedFilter,
	createScoreSource,
	createShelfEntries,
	createUser,
	createWishlistEntries
} from "../helpers/factories.helper";

type Account = Awaited<ReturnType<typeof createUserWithSession>>;
type Query = Record<string, string | number>;
type Fetch = (query: Query) => Promise<{ titles: string[]; total?: number }>;

const POKEMON = "Pokémon Rojo";
const RESIDENT_EVIL = "Resident Evil";
const SPIDER_MAN = "Spider-Man";
const ORANGE_JUICE = "100% Orange Juice";
const UNDERSCORE = "Under_Score\\Quest";
const FILLER = "Beta";
const LIBRARY_TITLES = [
	POKEMON,
	RESIDENT_EVIL,
	SPIDER_MAN,
	ORANGE_JUICE,
	UNDERSCORE,
	FILLER
];

const CROWDED_TITLE_COUNT = 12;
const LOCAL_SEARCH_LIMIT = 10;

let owner: Account;
let viewer: Account;
let target: Account;
let fetchers: Record<string, Fetch>;

function titlesOf(items: { title: string }[]) {
	return items.map(item => item.title).sort();
}

function authorized(path: string, query: Query, account: Account = owner) {
	return api()
		.get(path)
		.query(query)
		.set("Authorization", account.authorization);
}

async function seedLibrary() {
	const platform = await createPlatform();
	const games = [];
	for (const title of LIBRARY_TITLES) games.push(await createGame({ title }));

	await Favorite.bulkCreate(
		games.map((game, index) => ({
			userId: owner.user.id,
			gameId: game.id,
			position: index + 1
		}))
	);
	await createWishlistEntries(
		owner.user.id,
		games.map(game => game.id)
	);
	for (const game of games) {
		await createShelfEntries(owner.user.id, game.id, platform.id, 1);
	}
	for (const [index, game] of games.entries()) {
		const backlog = await createBacklog(
			owner.user.id,
			game.id,
			platform.id
		);
		await backlog.update({ isPublic: true });
		await Queue.create({
			userId: owner.user.id,
			backlogId: backlog.id,
			position: index + 1
		});
	}
}

async function seedCatalog() {
	await createGame({ title: "Evil" });
	await createGame({ title: "Evil!" });
	await createGame({ title: "Alone Evil" });
	await createGame({ title: "Resident Evil 4" });
	await createGame({ title: "Retired Evil", isActive: false });
	for (let index = 0; index < CROWDED_TITLE_COUNT; index++) {
		await createGame({
			title: `Evil Crowd ${String(index).padStart(2, "0")}`
		});
	}
}

async function seedUsers() {
	await target.user.update({ username: "target_user", name: "Target" });
	const people = [
		{ username: "jose_alvarez", name: "José Álvarez" },
		{ username: "pepe99", name: "José García" },
		{ username: "mario_bros", name: null },
		{ username: "plain_user", name: "Plain" }
	];
	const created: User[] = [];
	for (const { username, name } of people) {
		const user = await createUser({ username });
		await user.update({ name });
		created.push(user);
		await UserFollower.create({
			followerId: user.id,
			followingId: target.user.id
		});
		await UserFollower.create({
			followerId: target.user.id,
			followingId: user.id
		});
	}
}

async function seedLists() {
	const source = await createScoreSource({ scale: 100 });
	for (const name of [
		"Pokémon Favoritos",
		"Evil Resident",
		"Spider-Man Collection",
		"Mis juegos"
	]) {
		await createList(viewer.user.id, source.code, {
			name,
			isPublic: true
		});
	}
	await createList(viewer.user.id, source.code, {
		name: "Pokémon Secreta",
		isPublic: false
	});
}

async function seedSavedFilters() {
	const filters = [
		{ name: "Pokémon pendientes", description: null },
		{ name: "Cortos", description: "Resident Evil y similares" },
		{ name: "Spider-Man", description: null },
		{ name: "Otros", description: null }
	];
	for (const [index, { name, description }] of filters.entries()) {
		const filter = await createSavedFilter(owner.user.id, {
			name,
			position: index + 1
		});
		if (description) await filter.update({ description });
	}
}

async function seedFranchises() {
	for (const name of ["Pokémon", "Resident Evil", "Spider-Man", "Mario"]) {
		await createFranchise({ name });
	}
}

function paginatedFetcher(
	path: string,
	collection: string,
	pickTitle: (entry: never) => string
): Fetch {
	return async query => {
		const response = await authorized(path, query);
		assert.equal(response.status, 200);
		const entries = response.body.data[collection] as never[];
		return {
			titles: entries.map(pickTitle).sort(),
			total: response.body.data.total
		};
	};
}

function gameTitle(entry: { game: { title: string } }) {
	return entry.game.title;
}

function queueTitle(entry: { backlog: { game: { title: string } } }) {
	return entry.backlog.game.title;
}

function nameOf(entry: { name: string }) {
	return entry.name;
}

useTestDatabase(async () => {
	owner = await createUserWithSession();
	viewer = await createUserWithSession();
	target = await createUserWithSession();
	await seedLibrary();
	await seedCatalog();
	await seedUsers();
	await seedLists();
	await seedSavedFilters();
	await seedFranchises();

	fetchers = {
		favorites: paginatedFetcher(
			"/users/me/favorites",
			"favorites",
			gameTitle
		),
		wishlist: paginatedFetcher("/users/me/wishlist", "wishlist", gameTitle),
		"game shelf": paginatedFetcher(
			"/users/me/game-shelf",
			"gameShelf",
			gameTitle
		),
		backlog: paginatedFetcher("/users/me/backlog", "backlog", gameTitle),
		queue: paginatedFetcher("/users/me/queue", "queue", queueTitle)
	};
});

const LIBRARY_ENDPOINTS = [
	"favorites",
	"wishlist",
	"game shelf",
	"backlog",
	"queue"
];

for (const endpoint of LIBRARY_ENDPOINTS) {
	void describe(`search rules on ${endpoint}`, () => {
		const search = (text: string, extra: Query = {}) =>
			fetchers[endpoint]!({ search: text, ...extra });

		void it("ignores accents and case", async () => {
			assert.deepEqual((await search("pokemon")).titles, [POKEMON]);
			assert.deepEqual((await search("POKÉMON rojo")).titles, [POKEMON]);
		});

		void it("matches the words in any order", async () => {
			assert.deepEqual((await search("evil resident")).titles, [
				RESIDENT_EVIL
			]);
		});

		void it("ignores punctuation", async () => {
			assert.deepEqual((await search("spiderman")).titles, [SPIDER_MAN]);
			assert.deepEqual((await search("spider man")).titles, [SPIDER_MAN]);
		});

		void it("treats percent, underscore and backslash literally", async () => {
			assert.deepEqual((await search("orange% juice")).titles, [
				ORANGE_JUICE
			]);
			assert.deepEqual((await search("under_score")).titles, [
				UNDERSCORE
			]);
			assert.deepEqual((await search("score\\quest")).titles, [
				UNDERSCORE
			]);
			assert.deepEqual((await search("zzz%")).titles, []);
		});

		void it("does not filter when the search has no letters or digits", async () => {
			const all = await search("%_\\");
			assert.deepEqual(all.titles, [...LIBRARY_TITLES].sort());
		});

		void it("keeps total and pagination coherent", async () => {
			const page = await search("pokemon", { limit: 1, offset: 0 });
			assert.deepEqual(page.titles, [POKEMON]);
			assert.equal(page.total, 1);
			const empty = await search("pokemon", { limit: 1, offset: 5 });
			assert.deepEqual(empty.titles, []);
			assert.equal(empty.total, 1);
		});
	});
}

void describe("search rules on GET /games/search", () => {
	function searchGames(query: Query) {
		return authorized("/games/search", { local_only: "true", ...query });
	}

	async function titlesFor(query: Query) {
		const response = await searchGames(query);
		assert.equal(response.status, 200);
		return (response.body.data.games as { title: string }[]).map(
			game => game.title
		);
	}

	void it("ranks exact title first, then prefix, then the rest", async () => {
		const titles = await titlesFor({ query: "resident evil" });
		assert.deepEqual(titles, ["Resident Evil", "Resident Evil 4"]);
	});

	void it("ranks by group before alphabetical order", async () => {
		const titles = await titlesFor({ query: "evil" });
		assert.deepEqual(titles.slice(0, 2).sort(), ["Evil", "Evil!"]);
	});

	void it("returns the exact title even with more matches than the limit", async () => {
		const titles = await titlesFor({ query: "evil" });
		assert.equal(titles.length, LOCAL_SEARCH_LIMIT);
		assert.ok(titles.slice(0, 2).includes("Evil"));
		assert.ok(!titles.includes("Alone Evil"));
		assert.deepEqual(
			titles.slice(2),
			Array.from(
				{ length: LOCAL_SEARCH_LIMIT - 2 },
				(_, index) => `Evil Crowd ${String(index).padStart(2, "0")}`
			)
		);
	});

	void it("puts the rest after the prefix group, alphabetically", async () => {
		const titles = await titlesFor({ query: "evil resident" });
		assert.deepEqual(titles, ["Resident Evil", "Resident Evil 4"]);
	});

	void it("ignores accents, case, punctuation and word order", async () => {
		assert.deepEqual(await titlesFor({ query: "POKEMON rojo" }), [POKEMON]);
		assert.deepEqual(await titlesFor({ query: "spiderman" }), [SPIDER_MAN]);
		assert.deepEqual(await titlesFor({ query: "man-spider" }), [
			SPIDER_MAN
		]);
	});

	void it("treats percent, underscore and backslash literally", async () => {
		assert.deepEqual(await titlesFor({ query: "100% orange" }), [
			ORANGE_JUICE
		]);
		assert.deepEqual(await titlesFor({ query: "under_score" }), [
			UNDERSCORE
		]);
		assert.deepEqual(await titlesFor({ query: "zzz%" }), []);
	});

	void it("returns nothing for a query without letters or digits", async () => {
		assert.deepEqual(await titlesFor({ query: "%" }), []);
		assert.deepEqual(await titlesFor({ query: "_" }), []);
		assert.deepEqual(await titlesFor({ query: "\\" }), []);
	});

	void it("excludes inactive games", async () => {
		const titles = await titlesFor({ query: "retired" });
		assert.deepEqual(titles, []);
	});
});

void describe("search rules on GET /games/search without local_only", () => {
	void it("orders the local results by relevance", async () => {
		const response = await authorized("/games/search", { query: "evil" });
		assert.equal(response.status, 200);
		const titles = (response.body.data.games as { title: string }[]).map(
			game => game.title
		);
		assert.ok(titles.slice(0, 2).includes("Evil"));
		assert.ok(titles.includes("Alone Evil"));
		assert.equal(titles.at(-1), "Resident Evil 4");
		assert.equal(
			titles.indexOf("Alone Evil") > titles.indexOf("Evil Crowd 11"),
			true
		);
	});
});

void describe("search rules on GET /games", () => {
	async function titlesFor(query: Query) {
		const response = await authorized("/games", query);
		assert.equal(response.status, 200);
		return titlesOf(response.body.data.games);
	}

	void it("ignores accents, case, punctuation and word order", async () => {
		assert.deepEqual(await titlesFor({ search: "pokemon" }), [POKEMON]);
		assert.deepEqual(await titlesFor({ search: "man spider" }), [
			SPIDER_MAN
		]);
		assert.deepEqual(await titlesFor({ search: "ORANGE 100" }), [
			ORANGE_JUICE
		]);
	});

	void it("treats percent, underscore and backslash literally", async () => {
		assert.deepEqual(await titlesFor({ search: "under_score" }), [
			UNDERSCORE
		]);
		assert.deepEqual(await titlesFor({ search: "zzz%" }), []);
	});
});

void describe("search rules on GET /users/search", () => {
	async function usernamesFor(q: string) {
		const response = await authorized("/users/search", { q }, viewer);
		assert.equal(response.status, 200);
		return (response.body.data.users as { username: string }[])
			.map(user => user.username)
			.sort();
	}

	void it("ignores accents and case in the name", async () => {
		assert.deepEqual(await usernamesFor("jose"), [
			"jose_alvarez",
			"pepe99"
		]);
		assert.deepEqual(await usernamesFor("ÁLVAREZ"), ["jose_alvarez"]);
	});

	void it("matches the words in any order", async () => {
		assert.deepEqual(await usernamesFor("alvarez jose"), ["jose_alvarez"]);
	});

	void it("accepts each word in a different column", async () => {
		assert.deepEqual(await usernamesFor("pepe garcia"), ["pepe99"]);
	});

	void it("ignores punctuation in the username", async () => {
		assert.deepEqual(await usernamesFor("mario bros"), ["mario_bros"]);
		assert.deepEqual(await usernamesFor("mariobros"), ["mario_bros"]);
	});

	void it("treats percent, underscore and backslash literally", async () => {
		assert.deepEqual(await usernamesFor("zzz%"), []);
		assert.deepEqual(await usernamesFor("%"), []);
		assert.deepEqual(await usernamesFor("_"), []);
		assert.deepEqual(await usernamesFor("\\"), []);
	});
});

for (const kind of ["followers", "following"]) {
	void describe(`search rules on GET /users/:username/${kind}`, () => {
		async function usernamesFor(search: string) {
			const response = await api()
				.get(`/users/${target.user.username}/${kind}`)
				.query({ search });
			assert.equal(response.status, 200);
			return {
				usernames: (response.body.data.users as { username: string }[])
					.map(user => user.username)
					.sort(),
				total: response.body.data.total as number
			};
		}

		void it("ignores accents and case in the name", async () => {
			const result = await usernamesFor("JOSE");
			assert.deepEqual(result.usernames, ["jose_alvarez", "pepe99"]);
			assert.equal(result.total, 2);
		});

		void it("matches the words in any order and across columns", async () => {
			assert.deepEqual((await usernamesFor("alvarez jose")).usernames, [
				"jose_alvarez"
			]);
			assert.deepEqual((await usernamesFor("garcia pepe")).usernames, [
				"pepe99"
			]);
		});

		void it("treats percent, underscore and backslash literally", async () => {
			assert.deepEqual((await usernamesFor("zzz_")).usernames, []);
			assert.deepEqual((await usernamesFor("plain%")).usernames, [
				"plain_user"
			]);
		});

		void it("does not filter when the search has no letters or digits", async () => {
			const result = await usernamesFor("%_\\");
			assert.equal(result.total, 4);
		});
	});
}

void describe("search rules on GET /lists/search", () => {
	async function namesFor(query: string) {
		const response = await authorized("/lists/search", { query }, owner);
		assert.equal(response.status, 200);
		return (response.body.data.lists as { name: string }[])
			.map(nameOf)
			.sort();
	}

	void it("ignores accents and case", async () => {
		assert.deepEqual(await namesFor("pokemon"), ["Pokémon Favoritos"]);
	});

	void it("matches the words in any order", async () => {
		assert.deepEqual(await namesFor("resident evil"), ["Evil Resident"]);
	});

	void it("ignores punctuation", async () => {
		assert.deepEqual(await namesFor("spiderman"), [
			"Spider-Man Collection"
		]);
	});

	void it("treats percent, underscore and backslash literally", async () => {
		assert.deepEqual(await namesFor("zzz%"), []);
		assert.deepEqual(await namesFor("%"), []);
		assert.deepEqual(await namesFor("_"), []);
	});
});

void describe("search rules on GET /users/me/saved-filters", () => {
	async function namesFor(search: string) {
		const response = await authorized("/users/me/saved-filters", {
			search
		});
		assert.equal(response.status, 200);
		return (response.body.data.savedFilters as { name: string }[])
			.map(nameOf)
			.sort();
	}

	void it("ignores accents and case in the name", async () => {
		assert.deepEqual(await namesFor("POKEMON"), ["Pokémon pendientes"]);
	});

	void it("searches the description too", async () => {
		assert.deepEqual(await namesFor("similares"), ["Cortos"]);
	});

	void it("matches the words in any order, even across name and description", async () => {
		assert.deepEqual(await namesFor("evil resident"), ["Cortos"]);
		assert.deepEqual(await namesFor("cortos similares"), ["Cortos"]);
	});

	void it("ignores punctuation", async () => {
		assert.deepEqual(await namesFor("spiderman"), ["Spider-Man"]);
	});

	void it("treats percent, underscore and backslash literally", async () => {
		assert.deepEqual(await namesFor("zzz%"), []);
		assert.equal((await namesFor("%_\\")).length, 4);
	});
});

void describe("search rules on GET /franchises", () => {
	async function namesFor(search: string) {
		const response = await authorized("/franchises", { search });
		assert.equal(response.status, 200);
		return (response.body.data.franchises as { name: string }[])
			.map(nameOf)
			.sort();
	}

	void it("ignores accents and case", async () => {
		assert.deepEqual(await namesFor("pokemon"), ["Pokémon"]);
	});

	void it("matches the words in any order", async () => {
		assert.deepEqual(await namesFor("evil resident"), ["Resident Evil"]);
	});

	void it("ignores punctuation", async () => {
		assert.deepEqual(await namesFor("spiderman"), ["Spider-Man"]);
	});

	void it("treats percent, underscore and backslash literally", async () => {
		assert.deepEqual(await namesFor("zzz%"), []);
		assert.equal((await namesFor("%_\\")).length, 4);
	});
});
