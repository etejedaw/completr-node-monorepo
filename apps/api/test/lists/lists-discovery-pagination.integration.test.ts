import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sequelize } from "../../src/database/sequelize.database";
import { api } from "../helpers/app.helper";
import { type Account, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createList,
	createScoreSource,
	createUser
} from "../helpers/factories.helper";

interface PageBody {
	body: { data: { lists: { id: string }[]; total: number } };
}

interface Seed {
	viewer: Account;
	communityIdsNewestFirst: string[];
	officialIdsNewestFirst: string[];
	viewerListIds: string[];
	hiddenIds: string[];
}

let scoreSource: string;
let seed: Seed;

const SAME_INSTANT = new Date(Date.now() - 30 * 60_000);

function minutesAgo(minutes: number) {
	return new Date(Date.now() - minutes * 60_000);
}

async function publicListAt(userId: string, createdAt: Date, isPublic = true) {
	const list = await createList(userId, scoreSource, { isPublic });
	await sequelize.query(
		`UPDATE "Lists" SET "createdAt" = :createdAt WHERE "id" = :id`,
		{ replacements: { createdAt, id: list.id } }
	);
	return { id: list.id, createdAt };
}

function byNewestThenId(
	left: { id: string; createdAt: Date },
	right: { id: string; createdAt: Date }
) {
	const byDate = right.createdAt.getTime() - left.createdAt.getTime();
	if (byDate !== 0) return byDate;
	return right.id < left.id ? -1 : 1;
}

async function seedDiscovery(): Promise<Seed> {
	const viewer = await createUserWithSession();
	const [alice, bruno, carla] = await Promise.all([
		createUser(),
		createUser(),
		createUser()
	]);
	const admin = await createUser({ role: "admin" });

	const community = [
		await publicListAt(alice.id, minutesAgo(1)),
		await publicListAt(bruno.id, minutesAgo(2)),
		await publicListAt(carla.id, SAME_INSTANT),
		await publicListAt(alice.id, SAME_INSTANT),
		await publicListAt(bruno.id, SAME_INSTANT),
		await publicListAt(carla.id, minutesAgo(40)),
		await publicListAt(alice.id, minutesAgo(50))
	];
	const official = [
		await publicListAt(admin.id, minutesAgo(3)),
		await publicListAt(admin.id, minutesAgo(4)),
		await publicListAt(admin.id, minutesAgo(5))
	];
	const viewerLists = [
		await publicListAt(viewer.user.id, minutesAgo(0)),
		await publicListAt(viewer.user.id, minutesAgo(6), false)
	];
	const hidden = [
		await publicListAt(bruno.id, minutesAgo(0), false),
		await publicListAt(admin.id, minutesAgo(0), false)
	];

	return {
		viewer,
		communityIdsNewestFirst: community
			.toSorted(byNewestThenId)
			.map(l => l.id),
		officialIdsNewestFirst: official
			.toSorted(byNewestThenId)
			.map(l => l.id),
		viewerListIds: viewerLists.map(list => list.id),
		hiddenIds: hidden.map(list => list.id)
	};
}

useTestDatabase(async () => {
	scoreSource = (await createScoreSource({ scale: 100 })).code;
	seed = await seedDiscovery();
});

function getPage(
	path: string,
	query: Record<string, unknown> = {},
	authorization = seed.viewer.authorization
) {
	return api().get(path).query(query).set("Authorization", authorization);
}

function idsOf(response: PageBody) {
	return response.body.data.lists.map(list => list.id);
}

async function walk(path: string, limit: number) {
	const ids: string[] = [];
	const totals = new Set<number>();
	for (let offset = 0; ; offset += limit) {
		const response = await getPage(path, { limit, offset });
		assert.equal(response.status, 200);
		totals.add(response.body.data.total);
		ids.push(...idsOf(response));
		if (response.body.data.lists.length < limit) break;
	}
	return { ids, totals: [...totals] };
}

void describe("GET /lists/recent pagination", () => {
	void it("keeps the limit-only contract and adds the total", async () => {
		const response = await getPage("/lists/recent");

		assert.equal(response.status, 200);
		assert.deepEqual(idsOf(response), seed.communityIdsNewestFirst);
		assert.equal(response.body.data.total, 7);
	});

	void it("serves the next page from the offset, newest first", async () => {
		const first = await getPage("/lists/recent", { limit: 3 });
		const second = await getPage("/lists/recent", { limit: 3, offset: 3 });

		assert.deepEqual(
			idsOf(first),
			seed.communityIdsNewestFirst.slice(0, 3)
		);
		assert.deepEqual(
			idsOf(second),
			seed.communityIdsNewestFirst.slice(3, 6)
		);
		assert.equal(first.body.data.total, 7);
		assert.equal(second.body.data.total, 7);
	});

	for (const limit of [1, 2, 3, 4, 7, 50]) {
		void it(`walks every page of ${limit} without gaps or repeats, even with lists created in the same instant`, async () => {
			const { ids, totals } = await walk("/lists/recent", limit);

			assert.deepEqual(ids, seed.communityIdsNewestFirst);
			assert.deepEqual(totals, [7]);
		});
	}

	void it("answers an empty page with the real total past the end", async () => {
		const response = await getPage("/lists/recent", { offset: 500 });

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.lists, []);
		assert.equal(response.body.data.total, 7);
	});

	void it("never shows the viewer's own lists nor private lists", async () => {
		const { ids } = await walk("/lists/recent", 2);

		for (const id of [...seed.viewerListIds, ...seed.hiddenIds])
			assert.equal(ids.includes(id), false, id);
		for (const id of seed.officialIdsNewestFirst)
			assert.equal(ids.includes(id), false, id);
	});

	void it("shows the viewer's public list to everyone else", async () => {
		const stranger = await createUserWithSession();

		const response = await getPage(
			"/lists/recent",
			{ limit: 50 },
			stranger.authorization
		);

		assert.ok(idsOf(response).includes(seed.viewerListIds[0]!));
		assert.equal(idsOf(response).includes(seed.viewerListIds[1]!), false);
		assert.equal(response.body.data.total, 8);
	});

	void it("answers the same pages to a burst of concurrent requests", async () => {
		const offsets = [0, 2, 4, 6, 0, 2, 4, 6, 0, 2];

		const responses = await Promise.all(
			offsets.map(offset =>
				getPage("/lists/recent", { limit: 2, offset })
			)
		);

		responses.forEach((response, index) => {
			const offset = offsets[index]!;
			assert.equal(response.status, 200);
			assert.equal(response.body.data.total, 7);
			assert.deepEqual(
				idsOf(response),
				seed.communityIdsNewestFirst.slice(offset, offset + 2)
			);
		});
	});

	const garbage: [string, Record<string, unknown>][] = [
		["a negative offset", { offset: -1 }],
		["a text offset", { offset: "next" }],
		["a fractional offset", { offset: 1.5 }],
		["an offset beyond safe integers", { offset: "99999999999999999999" }],
		["a repeated offset", { offset: ["1", "2"] }],
		["an empty limit", { limit: "" }],
		["a page parameter", { page: 2 }],
		["a cursor parameter", { cursor: "abc" }]
	];
	for (const path of ["/lists/recent", "/lists/official"]) {
		for (const [description, query] of garbage) {
			void it(`rejects ${description} on ${path} with 422 COMMON_SCHEMA_INVALID`, async () => {
				const response = await getPage(path, query);

				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			});
		}
	}

	void it("drops a list made private from every page and from the total", async () => {
		const owner = await createUserWithSession();
		const list = await publicListAt(owner.user.id, minutesAgo(0.5));
		const before = await getPage("/lists/recent", { limit: 50 });
		assert.ok(idsOf(before).includes(list.id));

		await api()
			.patch(`/lists/${list.id}`)
			.set("Authorization", owner.authorization)
			.send({ isPublic: false })
			.expect(200);

		const after = await getPage("/lists/recent", { limit: 50 });
		assert.equal(idsOf(after).includes(list.id), false);
		assert.equal(after.body.data.total, before.body.data.total - 1);
	});

	void it("drops a deleted list even when the client asks for a stale page", async () => {
		const owner = await createUserWithSession();
		const list = await publicListAt(owner.user.id, minutesAgo(0.5));
		const before = await getPage("/lists/recent", { limit: 1 });
		assert.deepEqual(idsOf(before), [list.id]);

		await api()
			.delete(`/lists/${list.id}`)
			.set("Authorization", owner.authorization)
			.expect(204);

		const after = await getPage("/lists/recent", { limit: 1 });
		assert.deepEqual(
			idsOf(after),
			seed.communityIdsNewestFirst.slice(0, 1)
		);
		assert.equal(after.body.data.total, before.body.data.total - 1);
	});
});

void describe("GET /lists/official pagination", () => {
	void it("pages the official lists with a stable total", async () => {
		const { ids, totals } = await walk("/lists/official", 2);

		assert.deepEqual(ids, seed.officialIdsNewestFirst);
		assert.deepEqual(totals, [3]);
	});

	void it("keeps the limit-only contract and adds the total", async () => {
		const response = await getPage("/lists/official", { limit: 1 });

		assert.equal(response.status, 200);
		assert.deepEqual(
			idsOf(response),
			seed.officialIdsNewestFirst.slice(0, 1)
		);
		assert.equal(response.body.data.total, 3);
	});
});
