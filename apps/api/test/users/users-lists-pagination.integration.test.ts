import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { sequelize } from "../../src/database/sequelize.database";
import { ListFollower } from "../../src/list-followers/list-follower.model";
import { type List } from "../../src/lists/list.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	scoreSource = (await createScoreSource()).code;
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

type ListsKind = "lists" | "following-lists";

interface ListsQuery {
	limit?: number | string;
	offset?: number | string;
	search?: string;
	[key: string]: unknown;
}

const BASE_DATE = new Date("2026-01-01T00:00:00.000Z");

function minutesAfter(minutes: number) {
	return new Date(BASE_DATE.getTime() + minutes * 60_000);
}

async function setCreatedAt(
	table: "Lists" | "ListFollowers",
	id: string,
	createdAt: Date
) {
	await sequelize.query(
		`UPDATE "${table}" SET "createdAt" = :createdAt WHERE id = :id`,
		{ replacements: { createdAt, id } }
	);
}

function getLists(
	username: string,
	kind: ListsKind,
	query: ListsQuery = {},
	authorization?: string
) {
	const request = api().get(`/users/${username}/${kind}`).query(query);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function listIdsOf(
	kind: ListsKind,
	response: {
		body: {
			data: {
				lists?: { id: string }[];
				followingLists?: { id: string }[];
			};
		};
	}
) {
	const rows =
		kind === "lists"
			? response.body.data.lists!
			: response.body.data.followingLists!;
	return rows.map(list => list.id);
}

interface Fixture {
	owner: Account;
	viewer: Account;
	publicLists: List[];
	privateList: List;
	followedLists: List[];
	hiddenFollowedList: List;
	invisibleFollow: List;
	tiedLists: List[];
}

let fixture: Fixture;

async function seedCreatedLists(owner: Account) {
	const names = [
		"Pokémon Marathon",
		"Spider-Man Collection",
		"Resident Evil Ranking",
		"Cozy Winter",
		"Soulslikes 100%",
		"Short & Sweet"
	];
	const lists: List[] = [];
	for (const [index, name] of names.entries()) {
		const list = await createList(owner.user.id, scoreSource, {
			name,
			isPublic: true
		});
		await setCreatedAt("Lists", list.id, minutesAfter(index));
		lists.push(list);
	}
	return lists;
}

async function seedTiedLists(owner: Account) {
	const lists: List[] = [];
	for (let index = 0; index < 3; index++) {
		const list = await createList(owner.user.id, scoreSource, {
			name: `Tied ${index}`,
			isPublic: true
		});
		await setCreatedAt("Lists", list.id, minutesAfter(-60));
		lists.push(list);
	}
	return lists;
}

async function seedFollowedLists(owner: Account) {
	const curator = await createUserWithSession();
	const closedCurator = await createUserWithSession();
	await closedCurator.user.update({ listVisibility: "private" });

	const followedLists: List[] = [];
	for (const [index, name] of [
		"Metroidvania Gems",
		"Hidden Indies",
		"Rogue Runs"
	].entries()) {
		const list = await createList(curator.user.id, scoreSource, {
			name,
			isPublic: true
		});
		const follow = await ListFollower.create({
			listId: list.id,
			userId: owner.user.id
		});
		await setCreatedAt("ListFollowers", follow.id, minutesAfter(index));
		followedLists.push(list);
	}

	const hiddenFollowedList = await createList(
		closedCurator.user.id,
		scoreSource,
		{ name: "Metroidvania Secret", isPublic: true }
	);
	await ListFollower.create({
		listId: hiddenFollowedList.id,
		userId: owner.user.id
	});

	const invisibleFollow = await createList(curator.user.id, scoreSource, {
		name: "Metroidvania Muted",
		isPublic: true
	});
	await ListFollower.create({
		listId: invisibleFollow.id,
		userId: owner.user.id,
		isVisible: false
	});

	return { followedLists, hiddenFollowedList, invisibleFollow };
}

before(async () => {
	const owner = await createUserWithSession();
	const viewer = await createUserWithSession();
	const publicLists = await seedCreatedLists(owner);
	const tiedLists = await seedTiedLists(owner);
	const privateList = await createList(owner.user.id, scoreSource, {
		name: "Private Pokémon notes",
		isPublic: false
	});
	await setCreatedAt("Lists", privateList.id, minutesAfter(100));
	const followed = await seedFollowedLists(owner);
	fixture = {
		owner,
		viewer,
		publicLists,
		privateList,
		tiedLists,
		...followed
	};
});

function newestFirstPublicIds() {
	const tiedById = [...fixture.tiedLists]
		.map(list => list.id)
		.sort()
		.reverse();
	return [
		...[...fixture.publicLists].reverse().map(list => list.id),
		...tiedById
	];
}

function newestFirstFollowedIds() {
	return [...fixture.followedLists].reverse().map(list => list.id);
}

void describe("GET /users/:username/lists pagination", () => {
	void it("keeps the full response without limit, newest first with id as tiebreaker", async () => {
		const response = await getLists(fixture.owner.user.username, "lists");

		assert.equal(response.status, 200);
		assert.deepEqual(listIdsOf("lists", response), newestFirstPublicIds());
		assert.equal(response.body.data.total, 9);
	});

	void it("pages with limit and offset while total stays unpaginated", async () => {
		const expected = newestFirstPublicIds();
		const seen: string[] = [];
		for (let offset = 0; offset < expected.length; offset += 4) {
			const response = await getLists(
				fixture.owner.user.username,
				"lists",
				{
					limit: 4,
					offset
				}
			);
			assert.equal(response.status, 200);
			assert.equal(response.body.data.total, 9);
			seen.push(...listIdsOf("lists", response));
		}

		assert.deepEqual(seen, expected);
	});

	void it("answers an out-of-range offset with an empty page and the real total", async () => {
		const response = await getLists(fixture.owner.user.username, "lists", {
			limit: 4,
			offset: 500
		});

		assert.equal(response.status, 200);
		assert.deepEqual(listIdsOf("lists", response), []);
		assert.equal(response.body.data.total, 9);
	});

	void it("serves pages in the same order on every request", async () => {
		const query = { limit: 2, offset: 6 };
		const first = await getLists(
			fixture.owner.user.username,
			"lists",
			query
		);
		const second = await getLists(
			fixture.owner.user.username,
			"lists",
			query
		);

		assert.deepEqual(listIdsOf("lists", first), listIdsOf("lists", second));
		assert.deepEqual(
			listIdsOf("lists", first),
			newestFirstPublicIds().slice(6, 8)
		);
	});

	void it("searches the name without accents, case or word order, and counts only matches", async () => {
		const cases: [string, string[]][] = [
			["pokemon", [fixture.publicLists[0]!.id]],
			["SPIDERMAN", [fixture.publicLists[1]!.id]],
			["evil resident", [fixture.publicLists[2]!.id]],
			["100", [fixture.publicLists[4]!.id]]
		];
		for (const [search, ids] of cases) {
			const response = await getLists(
				fixture.owner.user.username,
				"lists",
				{
					search
				}
			);
			assert.equal(response.status, 200, search);
			assert.deepEqual(listIdsOf("lists", response), ids, search);
			assert.equal(response.body.data.total, ids.length, search);
		}
	});

	void it("treats wildcards and symbols literally and finds nothing for unknown words", async () => {
		const unfiltered = await getLists(
			fixture.owner.user.username,
			"lists",
			{
				search: "%_\\"
			}
		);
		assert.equal(unfiltered.status, 200);
		assert.equal(unfiltered.body.data.total, 9);

		for (const search of [
			"<script>alert(1)</script>",
			"🎮 zelda",
			'\'; DROP TABLE "Lists"; --'
		]) {
			const response = await getLists(
				fixture.owner.user.username,
				"lists",
				{
					search
				}
			);
			assert.equal(response.status, 200, search);
			assert.deepEqual(listIdsOf("lists", response), [], search);
			assert.equal(response.body.data.total, 0, search);
		}

		const emojiOnly = await getLists(fixture.owner.user.username, "lists", {
			search: "🎮🎮"
		});
		assert.equal(emojiOnly.status, 200);
		assert.equal(emojiOnly.body.data.total, 9);
	});

	void it("combines search with pagination", async () => {
		const response = await getLists(fixture.owner.user.username, "lists", {
			search: "tied",
			limit: 2,
			offset: 1
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 3);
		assert.deepEqual(
			listIdsOf("lists", response),
			newestFirstPublicIds().slice(7, 9)
		);
	});

	void it("includes private lists only for their owner, also when paginating and searching", async () => {
		const asOwner = await getLists(
			fixture.owner.user.username,
			"lists",
			{ limit: 1, search: "pokemon" },
			fixture.owner.authorization
		);
		assert.equal(asOwner.status, 200);
		assert.equal(asOwner.body.data.total, 2);
		assert.deepEqual(listIdsOf("lists", asOwner), [fixture.privateList.id]);

		const asViewer = await getLists(
			fixture.owner.user.username,
			"lists",
			{ limit: 1, search: "pokemon" },
			fixture.viewer.authorization
		);
		assert.equal(asViewer.status, 200);
		assert.equal(asViewer.body.data.total, 1);
		assert.deepEqual(listIdsOf("lists", asViewer), [
			fixture.publicLists[0]!.id
		]);
	});
});

void describe("GET /users/:username/following-lists pagination", () => {
	void it("keeps the full response without limit and counts only visible follows", async () => {
		const response = await getLists(
			fixture.owner.user.username,
			"following-lists"
		);

		assert.equal(response.status, 200);
		assert.deepEqual(
			listIdsOf("following-lists", response),
			newestFirstFollowedIds()
		);
		assert.equal(response.body.data.total, 3);
	});

	void it("pages with limit and offset and keeps the unpaginated total", async () => {
		const first = await getLists(
			fixture.owner.user.username,
			"following-lists",
			{ limit: 2 }
		);
		const second = await getLists(
			fixture.owner.user.username,
			"following-lists",
			{ limit: 2, offset: 2 }
		);
		const outOfRange = await getLists(
			fixture.owner.user.username,
			"following-lists",
			{ limit: 2, offset: 40 }
		);

		assert.deepEqual(
			[
				...listIdsOf("following-lists", first),
				...listIdsOf("following-lists", second)
			],
			newestFirstFollowedIds()
		);
		for (const response of [first, second, outOfRange]) {
			assert.equal(response.status, 200);
			assert.equal(response.body.data.total, 3);
		}
		assert.deepEqual(listIdsOf("following-lists", outOfRange), []);
	});

	void it("searches the list name without leaking hidden or muted follows", async () => {
		const response = await getLists(
			fixture.owner.user.username,
			"following-lists",
			{ search: "metroidvania" },
			fixture.owner.authorization
		);

		assert.equal(response.status, 200);
		assert.deepEqual(listIdsOf("following-lists", response), [
			fixture.followedLists[0]!.id
		]);
		assert.equal(response.body.data.total, 1);
	});

	void it("does not filter on a search without letters or digits", async () => {
		const response = await getLists(
			fixture.owner.user.username,
			"following-lists",
			{ search: "%%" }
		);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 3);
	});
});

void describe("GET /users/:username/lists and following-lists validation and access", () => {
	const KINDS: ListsKind[] = ["lists", "following-lists"];

	for (const kind of KINDS) {
		void it(`rejects invalid pagination, search or unknown params on ${kind} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const invalidQueries: ListsQuery[] = [
				{ limit: 0 },
				{ limit: 101 },
				{ limit: -1 },
				{ limit: 1.5 },
				{ limit: "abc" },
				{ offset: -1 },
				{ offset: "x" },
				{ search: "" },
				{ search: "a".repeat(101) },
				{ page: 2 }
			];
			for (const query of invalidQueries) {
				const response = await getLists(
					fixture.owner.user.username,
					kind,
					query
				);
				assert.equal(response.status, 422, JSON.stringify(query));
				assert.equal(
					response.body.type,
					"COMMON_SCHEMA_INVALID",
					JSON.stringify(query)
				);
			}
		});

		void it(`answers 404 USER_NOT_FOUND on ${kind} for an unknown user even with pagination`, async () => {
			const response = await getLists(
				`ghost_${randomUUID().slice(0, 8)}`,
				kind,
				{ limit: 5, offset: 0, search: "anything" }
			);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		});

		void it(`answers 403 USER_PRIVATE on ${kind} for a private profile even with pagination`, async () => {
			const closed = await createUserWithSession();
			await closed.user.update({ profileVisibility: "private" });

			const response = await getLists(
				closed.user.username,
				kind,
				{ limit: 5 },
				fixture.viewer.authorization
			);

			assert.equal(response.status, 403);
			assert.equal(response.body.type, "USER_PRIVATE");
		});
	}

	void it("closes created lists but keeps following lists when only the lists section is private", async () => {
		const owner = await createUserWithSession();
		await owner.user.update({ listVisibility: "private" });
		const curated = await createList(fixture.viewer.user.id, scoreSource, {
			name: "Shared Favourites",
			isPublic: true
		});
		await ListFollower.create({
			listId: curated.id,
			userId: owner.user.id
		});

		const created = await getLists(owner.user.username, "lists", {
			limit: 5
		});
		const following = await getLists(
			owner.user.username,
			"following-lists",
			{ limit: 5 }
		);

		assert.equal(created.status, 403);
		assert.equal(created.body.type, "USER_PRIVATE");
		assert.equal(following.status, 200);
		assert.deepEqual(listIdsOf("following-lists", following), [curated.id]);
		assert.equal(following.body.data.total, 1);
	});

	void it("lets a mutual friend page through friends-only lists", async () => {
		const owner = await createUserWithSession();
		await owner.user.update({
			profileVisibility: "friends",
			listVisibility: "friends"
		});
		await UserFollower.create({
			followerId: owner.user.id,
			followingId: fixture.viewer.user.id
		});
		await UserFollower.create({
			followerId: fixture.viewer.user.id,
			followingId: owner.user.id
		});
		for (let index = 0; index < 3; index++)
			await createList(owner.user.id, scoreSource, {
				name: `Friends ${index}`,
				isPublic: true
			});

		const asFriend = await getLists(
			owner.user.username,
			"lists",
			{ limit: 2 },
			fixture.viewer.authorization
		);
		const asStranger = await getLists(owner.user.username, "lists", {
			limit: 2
		});

		assert.equal(asFriend.status, 200);
		assert.equal(listIdsOf("lists", asFriend).length, 2);
		assert.equal(asFriend.body.data.total, 3);
		assert.equal(asStranger.status, 403);
		assert.equal(asStranger.body.type, "USER_PRIVATE");
	});
});
