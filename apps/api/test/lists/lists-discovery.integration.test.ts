import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { List } from "../../src/lists/list.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createList,
	createScoreSource,
	createUser
} from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource({ scale: 100 });
	scoreSource = source.code;
});

interface ListSummary {
	id: string;
	isOfficial: boolean;
	previewItems: { game: { id: string } }[];
}

async function createListAt(
	userId: string,
	createdAt: Date,
	overrides: { name?: string; isPublic?: boolean } = {}
) {
	const list = await createList(userId, scoreSource, {
		isPublic: true,
		...overrides
	});
	await List.update({ createdAt }, { where: { id: list.id }, silent: true });
	return list;
}

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60_000);
}

async function getLists(path: string, query: Record<string, unknown> = {}) {
	const viewer = await createUserWithSession();
	return api()
		.get(path)
		.query(query)
		.set("Authorization", viewer.authorization);
}

function idsOf(response: { body: { data: { lists: ListSummary[] } } }) {
	return response.body.data.lists.map(list => list.id);
}

void describe("GET /lists/official", () => {
	void it("lists the public lists of admins as official, newest first", async () => {
		const admin = await createUser({ role: "admin" });
		const user = await createUser();
		const older = await createListAt(admin.id, minutesAgo(20));
		const newer = await createListAt(admin.id, minutesAgo(10));
		await createListAt(admin.id, minutesAgo(5), { isPublic: false });
		await createListAt(user.id, minutesAgo(1));

		const response = await getLists("/lists/official");

		assert.equal(response.status, 200);
		assert.deepEqual(idsOf(response), [newer.id, older.id]);
		assert.ok(
			response.body.data.lists.every(
				(list: ListSummary) => list.isOfficial
			)
		);
	});

	void it("honours the limit", async () => {
		const admin = await createUser({ role: "admin" });
		await createListAt(admin.id, minutesAgo(3));
		await createListAt(admin.id, minutesAgo(2));

		const response = await getLists("/lists/official", { limit: 1 });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.lists.length, 1);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/lists/official")
			.set("Authorization", "Bearer invalid");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /lists/recent", () => {
	void it("lists the newest public lists of regular users with a preview", async () => {
		const owner = await createUserWithSession();
		const admin = await createUser({ role: "admin" });
		const newest = await createListAt(
			owner.user.id,
			new Date(Date.now() + 60_000)
		);
		const [first, second] = await Promise.all([createGame(), createGame()]);
		await api()
			.put(`/lists/${newest.id}/items`)
			.set("Authorization", owner.authorization)
			.send({ gameIds: [second.id, first.id] })
			.expect(200);
		const hidden = await createListAt(
			owner.user.id,
			new Date(Date.now() + 120_000),
			{
				isPublic: false
			}
		);
		const official = await createListAt(
			admin.id,
			new Date(Date.now() + 180_000)
		);

		const response = await getLists("/lists/recent");

		assert.equal(response.status, 200);
		const ids = idsOf(response);
		assert.equal(ids[0], newest.id);
		assert.equal(ids.includes(hidden.id), false);
		assert.equal(ids.includes(official.id), false);
		assert.deepEqual(
			response.body.data.lists[0].previewItems.map(
				(item: { game: { id: string } }) => item.game.id
			),
			[second.id, first.id]
		);
	});

	void it("honours the limit", async () => {
		const owner = await createUser();
		await createListAt(owner.id, minutesAgo(3));
		await createListAt(owner.id, minutesAgo(2));

		const response = await getLists("/lists/recent", { limit: 1 });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.lists.length, 1);
	});
});

void describe("limit validation of the discovery endpoints", () => {
	for (const path of ["/lists/recent", "/lists/official"]) {
		for (const limit of ["many", "0", "51", "1.5"]) {
			void it(`rejects limit=${limit} on ${path} with 422 COMMON_SCHEMA_INVALID`, async () => {
				const response = await getLists(path, { limit });

				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			});
		}

		void it(`accepts the maximum limit of 50 on ${path}`, async () => {
			const response = await getLists(path, { limit: 50 });

			assert.equal(response.status, 200);
		});
	}
});

void describe("GET /lists/search", () => {
	void it("finds public lists by name, case-insensitive and sorted by name", async () => {
		const owner = await createUser();
		const zeta = await createList(owner.id, scoreSource, {
			name: "Zeta roguelikes",
			isPublic: true
		});
		const alpha = await createList(owner.id, scoreSource, {
			name: "Alpha ROGUELIKES",
			isPublic: true
		});
		await createList(owner.id, scoreSource, {
			name: "Secret roguelikes",
			isPublic: false
		});
		await createList(owner.id, scoreSource, {
			name: "Cozy farming",
			isPublic: true
		});

		const response = await getLists("/lists/search", {
			query: "roguelike"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(idsOf(response), [alpha.id, zeta.id]);
	});

	void it("answers an empty list when nothing matches", async () => {
		const response = await getLists("/lists/search", {
			query: "no-such-list"
		});

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.lists, []);
	});

	for (const [description, query] of [
		["a missing query", {}],
		["an empty query", { query: "" }],
		["unknown parameters", { query: "rpg", page: 2 }]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const response = await getLists("/lists/search", query);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get("/lists/search")
			.query({ query: "rpg" })
			.set("Authorization", "Bearer invalid");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});
