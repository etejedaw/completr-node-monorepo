import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import {
	APPEARANCE_COLORS,
	APPEARANCE_ICONS
} from "../../src/common/constants/appearance.constants";
import { UserGameTag } from "../../src/mood-tags/user-game-tag.model";
import { SavedFilter } from "../../src/saved-filters/saved-filter.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform,
	createSavedFilter
} from "../helpers/factories.helper";

const FILTERS_PATH = "/users/me/saved-filters";
const FREE_FILTER_LIMIT = 5;

useTestDatabase();

async function createFiltersFor(userId: string, count: number) {
	const filters = [];
	for (let index = 0; index < count; index++) {
		filters.push(await createSavedFilter(userId, { position: index + 1 }));
	}
	return filters;
}

function postFilter(authorization: string, body: Record<string, unknown>) {
	return api()
		.post(FILTERS_PATH)
		.set("Authorization", authorization)
		.send(body);
}

async function getFilters(authorization: string) {
	const response = await api()
		.get(FILTERS_PATH)
		.set("Authorization", authorization)
		.expect(200);
	return response.body.data as {
		savedFilters: {
			id: string;
			isDefault: boolean;
			showInBacklog: boolean;
		}[];
		total: number;
		frozen: boolean;
	};
}

void describe("POST /users/me/saved-filters", () => {
	void it("creates a filter at the end of the list", async () => {
		const owner = await createUserWithSession();
		const [existing] = await createFiltersFor(owner.user.id, 1);

		const response = await postFilter(owner.authorization, {
			name: "Short RPGs",
			filters: { max_duration: "20", genres: "rpg" },
			sortBy: "ratio",
			sortOrder: "asc",
			icon: "star",
			color: "sky"
		});

		assert.equal(response.status, 201);
		const created = response.body.data.savedFilter;
		assert.equal(created.name, "Short RPGs");
		assert.deepEqual(created.filters, {
			max_duration: "20",
			genres: "rpg"
		});
		assert.equal(created.sortOrder, "asc");
		assert.equal(created.icon, "star");
		const { savedFilters } = await getFilters(owner.authorization);
		assert.deepEqual(
			savedFilters.map(filter => filter.id),
			[existing!.id, created.id]
		);
	});

	void it("accepts platform icons on create", async () => {
		const owner = await createUserWithSession();

		for (const icon of ["smartphone", "computer", "tv"]) {
			const response = await postFilter(owner.authorization, {
				name: `Platform ${icon}`,
				filters: {},
				icon
			});

			assert.equal(response.status, 201);
			assert.equal(response.body.data.savedFilter.icon, icon);
		}
	});

	void it("keeps a single default filter and shows it in the backlog", async () => {
		const owner = await createUserWithSession();
		const first = await postFilter(owner.authorization, {
			name: "First default",
			filters: {},
			isDefault: true
		}).expect(201);

		const second = await postFilter(owner.authorization, {
			name: "Second default",
			filters: {},
			isDefault: true
		});

		assert.equal(second.status, 201);
		assert.equal(second.body.data.savedFilter.showInBacklog, true);
		const defaults = new Map(
			(await getFilters(owner.authorization)).savedFilters.map(filter => [
				filter.id,
				filter.isDefault
			])
		);
		assert.equal(defaults.get(first.body.data.savedFilter.id), false);
		assert.equal(defaults.get(second.body.data.savedFilter.id), true);
	});

	for (const [description, body] of [
		[
			"filters with an unknown status",
			{ name: "Broken", filters: { status: "paused" } }
		],
		[
			"filters with a malformed date",
			{ name: "Broken", filters: { started_from: "yesterday" } }
		],
		["a missing name", { filters: {} }],
		["missing filters", { name: "No filters" }],
		["an unknown icon", { name: "Bad icon", filters: {}, icon: "rocket" }],
		[
			"an unknown stat",
			{ name: "Bad stat", filters: {}, enabledStats: ["xp"] }
		]
	] as const) {
		void it(`rejects ${description} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const owner = await createUserWithSession();

			const response = await postFilter(owner.authorization, body);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("rejects a free user over the limit with 402 SAVED_FILTER_LIMIT_REACHED", async () => {
		const owner = await createUserWithSession("user");
		await createFiltersFor(owner.user.id, FREE_FILTER_LIMIT);

		const response = await postFilter(owner.authorization, {
			name: "One too many",
			filters: {}
		});

		assert.equal(response.status, 402);
		assert.equal(response.body.type, "SAVED_FILTER_LIMIT_REACHED");
	});

	void it("lets a premium user go over the free limit", async () => {
		const owner = await createUserWithSession("premium");
		await createFiltersFor(owner.user.id, FREE_FILTER_LIMIT);

		const response = await postFilter(owner.authorization, {
			name: "Premium extra",
			filters: {}
		});

		assert.equal(response.status, 201);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await postFilter("Bearer invalid", {
			name: "Nope",
			filters: {}
		});

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});
});

void describe("GET /users/me/saved-filters", () => {
	void it("lists only the caller's filters and searches them", async () => {
		const owner = await createUserWithSession();
		await createSavedFilter(owner.user.id, {
			name: "Cozy evenings",
			position: 1
		});
		await createSavedFilter(owner.user.id, {
			name: "Hard games",
			position: 2
		});
		await createFiltersFor((await createUserWithSession()).user.id, 1);

		const all = await getFilters(owner.authorization);
		assert.equal(all.total, 2);
		assert.equal(all.frozen, false);

		const searched = await api()
			.get(FILTERS_PATH)
			.query({ search: "cozy" })
			.set("Authorization", owner.authorization)
			.expect(200);
		assert.equal(searched.body.data.total, 1);
	});

	void it("flags a free user over the limit as frozen", async () => {
		const owner = await createUserWithSession("user");
		await createFiltersFor(owner.user.id, FREE_FILTER_LIMIT + 1);

		assert.equal((await getFilters(owner.authorization)).frozen, true);
	});
});

void describe("PATCH /users/me/saved-filters/:filterId", () => {
	void it("updates a filter and drops the default flag when hidden from the backlog", async () => {
		const owner = await createUserWithSession();
		const created = await postFilter(owner.authorization, {
			name: "Default view",
			filters: {},
			isDefault: true
		}).expect(201);
		const filterId = created.body.data.savedFilter.id;

		const response = await api()
			.patch(`${FILTERS_PATH}/${filterId}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Hidden view", showInBacklog: false });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.savedFilter.name, "Hidden view");
		assert.equal(response.body.data.savedFilter.showInBacklog, false);
		assert.equal(response.body.data.savedFilter.isDefault, false);
	});

	void it("accepts every shared appearance icon and color on update", async () => {
		const owner = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		for (const icon of APPEARANCE_ICONS) {
			const response = await api()
				.patch(`${FILTERS_PATH}/${filter.id}`)
				.set("Authorization", owner.authorization)
				.send({ icon });
			assert.equal(response.status, 200, icon);
			assert.equal(response.body.data.savedFilter.icon, icon);
		}
		for (const color of APPEARANCE_COLORS) {
			const response = await api()
				.patch(`${FILTERS_PATH}/${filter.id}`)
				.set("Authorization", owner.authorization)
				.send({ color });
			assert.equal(response.status, 200, color);
			assert.equal(response.body.data.savedFilter.color, color);
		}
	});

	void it("rejects an icon or a color outside the shared appearance lists on update", async () => {
		const owner = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);
		await filter.update({ icon: "star", color: "sky" });

		for (const body of [
			{ icon: "rocket" },
			{ icon: "" },
			{ color: "#ff0000" },
			{ color: "Rose" }
		]) {
			const response = await api()
				.patch(`${FILTERS_PATH}/${filter.id}`)
				.set("Authorization", owner.authorization)
				.send(body);
			assert.equal(response.status, 422, JSON.stringify(body));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		const stored = await SavedFilter.findByPk(filter.id);
		assert.deepEqual([stored?.icon, stored?.color], ["star", "sky"]);
	});

	void it("accepts a platform icon on update", async () => {
		const owner = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.patch(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", owner.authorization)
			.send({ icon: "smartphone" });

		assert.equal(response.status, 200);
		assert.equal(response.body.data.savedFilter.icon, "smartphone");
	});

	void it("rejects invalid filters with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.patch(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", owner.authorization)
			.send({ filters: { status: "paused" } });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.deepEqual((await filter.reload()).filters, {});
	});

	void it("rejects editing another user's filter with 404 SAVED_FILTER_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id, { name: "Mine" });

		const response = await api()
			.patch(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", intruder.authorization)
			.send({ name: "Hijacked" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
		await filter.reload();
		assert.equal(filter.name, "Mine");
	});

	void it("answers 404 SAVED_FILTER_NOT_FOUND for an unknown filter", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.patch(`${FILTERS_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Ghost" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
	});

	void it("freezes a free user over the limit: no updates, deletes allowed", async () => {
		const owner = await createUserWithSession("user");
		const filters = await createFiltersFor(
			owner.user.id,
			FREE_FILTER_LIMIT + 1
		);

		const patched = await api()
			.patch(`${FILTERS_PATH}/${filters[0]!.id}`)
			.set("Authorization", owner.authorization)
			.send({ name: "Frozen" });
		assert.equal(patched.status, 402);
		assert.equal(patched.body.type, "SAVED_FILTER_FROZEN");

		const deleted = await api()
			.delete(`${FILTERS_PATH}/${filters[0]!.id}`)
			.set("Authorization", owner.authorization);
		assert.equal(deleted.status, 204);
		assert.equal((await getFilters(owner.authorization)).frozen, false);
	});
});

void describe("PUT /users/me/saved-filters/reorder", () => {
	void it("reorders the caller's filters", async () => {
		const owner = await createUserWithSession();
		const [first, second, third] = await createFiltersFor(owner.user.id, 3);

		const response = await api()
			.put(`${FILTERS_PATH}/reorder`)
			.set("Authorization", owner.authorization)
			.send({ ids: [third!.id, first!.id, second!.id] });

		assert.equal(response.status, 200);
		assert.deepEqual(
			(await getFilters(owner.authorization)).savedFilters.map(
				filter => filter.id
			),
			[third!.id, first!.id, second!.id]
		);
	});

	void it("rejects another user's filter with 404 SAVED_FILTER_NOT_FOUND keeping the order", async () => {
		const owner = await createUserWithSession();
		const [first, second] = await createFiltersFor(owner.user.id, 2);
		const [foreign] = await createFiltersFor(
			(await createUserWithSession()).user.id,
			1
		);

		const response = await api()
			.put(`${FILTERS_PATH}/reorder`)
			.set("Authorization", owner.authorization)
			.send({ ids: [second!.id, foreign!.id, first!.id] });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
		assert.deepEqual(
			(await getFilters(owner.authorization)).savedFilters.map(
				filter => filter.id
			),
			[first!.id, second!.id]
		);
	});

	void it("rejects an empty list with 422 COMMON_SCHEMA_INVALID", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.put(`${FILTERS_PATH}/reorder`)
			.set("Authorization", owner.authorization)
			.send({ ids: [] });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("GET /users/me/saved-filters/:filterId/stats", () => {
	void it("computes the stats of the backlog entries matching the filter", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const [first, second, third] = await Promise.all([
			createGame(),
			createGame(),
			createGame()
		]);
		await createBacklog(owner.user.id, first.id, platform.id, {
			status: "completed"
		});
		await createBacklog(owner.user.id, second.id, platform.id, {
			status: "abandoned"
		});
		await createBacklog(owner.user.id, third.id, platform.id, {
			status: "playing"
		});
		const filter = await postFilter(owner.authorization, {
			name: "Finished",
			filters: { status: "completed,abandoned" }
		}).expect(201);

		const response = await api()
			.get(`${FILTERS_PATH}/${filter.body.data.savedFilter.id}/stats`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		const { stats } = response.body.data;
		assert.equal(stats.totalEntries, 2);
		assert.equal(stats.countByStatus.completed, 1);
		assert.equal(stats.countByStatus.abandoned, 1);
		assert.equal(stats.countByStatus.playing, 0);
		assert.equal(stats.completionRate, 0.5);
		assert.equal(stats.abandonmentRate, 0.5);
	});

	void it("expresses the average and best ratios in the 0-100 scale", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const [fast, slow, unplayed] = await Promise.all([
			createGame(),
			createGame(),
			createGame()
		]);
		await Backlog.create({
			userId: owner.user.id,
			gameId: fast.id,
			platformId: platform.id,
			status: "completed",
			score: 4,
			duration: 10,
			realDuration: 8
		});
		await Backlog.create({
			userId: owner.user.id,
			gameId: slow.id,
			platformId: platform.id,
			status: "completed",
			score: 3,
			duration: 20,
			realDuration: 30
		});
		await Backlog.create({
			userId: owner.user.id,
			gameId: unplayed.id,
			platformId: platform.id,
			status: "not_started",
			score: 4,
			duration: 7
		});
		const filter = await postFilter(owner.authorization, {
			name: "Everything",
			filters: {}
		}).expect(201);

		const response = await api()
			.get(`${FILTERS_PATH}/${filter.body.data.savedFilter.id}/stats`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 200);
		const { stats } = response.body.data;
		assert.equal(stats.avgRatio, 7.48);
		assert.equal(stats.avgPersonalRatio, 6);
		assert.equal(stats.bestPersonalRatio.game.id, fast.id);
		assert.equal(stats.bestPersonalRatio.value, 10);
	});

	void it("rejects another user's filter with 404 SAVED_FILTER_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.get(`${FILTERS_PATH}/${filter.id}/stats`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
	});

	void it("rejects stats of a filter whose stored filters are invalid with 422 SAVED_FILTER_VALIDATION_ERROR", async () => {
		const owner = await createUserWithSession();
		const filter = await SavedFilter.create({
			userId: owner.user.id,
			name: "Broken",
			filters: { status: "paused" },
			position: 1
		});

		const response = await api()
			.get(`${FILTERS_PATH}/${filter.id}/stats`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "SAVED_FILTER_VALIDATION_ERROR");
	});
});

void describe("GET /users/me/saved-filters/:filterId/stats with applied filters", () => {
	async function seedLibrary() {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const [cozy, grim, idle, fresh] = await Promise.all([
			createGame(),
			createGame(),
			createGame(),
			createGame()
		]);
		await createBacklog(owner.user.id, cozy.id, platform.id, {
			status: "completed"
		});
		await createBacklog(owner.user.id, grim.id, platform.id, {
			status: "completed"
		});
		await createBacklog(owner.user.id, idle.id, platform.id, {
			status: "playing"
		});
		await createBacklog(owner.user.id, fresh.id, platform.id, {
			status: "not_started"
		});
		await UserGameTag.bulkCreate([
			{ userId: owner.user.id, gameId: cozy.id, tag: "cozy" },
			{ userId: owner.user.id, gameId: cozy.id, tag: "short" },
			{ userId: owner.user.id, gameId: grim.id, tag: "short" },
			{ userId: owner.user.id, gameId: idle.id, tag: "cozy" }
		]);
		const view = await postFilter(owner.authorization, {
			name: "Completed",
			filters: { status: "completed" }
		}).expect(201);
		return {
			owner,
			platform,
			viewId: view.body.data.savedFilter.id as string
		};
	}

	function getStats(
		authorization: string,
		viewId: string,
		query: Record<string, string | string[]> = {}
	) {
		return api()
			.get(`${FILTERS_PATH}/${viewId}/stats`)
			.query(query)
			.set("Authorization", authorization);
	}

	void it("uses the saved filters when no filter params arrive", async () => {
		const { owner, viewId } = await seedLibrary();

		const response = await getStats(owner.authorization, viewId);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.stats.totalEntries, 2);
		assert.equal(response.body.data.stats.countByStatus.completed, 2);
	});

	void it("uses the applied filters instead of the saved ones", async () => {
		const { owner, viewId } = await seedLibrary();

		const response = await getStats(owner.authorization, viewId, {
			status: "playing,not_started"
		});

		assert.equal(response.status, 200);
		const { stats } = response.body.data;
		assert.equal(stats.totalEntries, 2);
		assert.equal(stats.countByStatus.completed, 0);
		assert.equal(stats.countByStatus.playing, 1);
		assert.equal(stats.countByStatus.not_started, 1);
	});

	void it("keeps only entries whose game has every applied tag", async () => {
		const { owner, viewId } = await seedLibrary();

		const both = await getStats(owner.authorization, viewId, {
			mood_tags: "cozy,short"
		});
		const cozyCompleted = await getStats(owner.authorization, viewId, {
			status: "completed",
			mood_tags: "cozy"
		});

		assert.equal(both.status, 200);
		assert.equal(both.body.data.stats.totalEntries, 1);
		assert.equal(both.body.data.stats.countByStatus.completed, 1);
		assert.equal(cozyCompleted.status, 200);
		assert.equal(cozyCompleted.body.data.stats.totalEntries, 1);
	});

	void it("computes over the whole library when the applied params filter nothing", async () => {
		const { owner, viewId } = await seedLibrary();

		const onlySort = await getStats(owner.authorization, viewId, {
			sort_by: "title",
			sort_order: "asc"
		});
		const blankPlatforms = await getStats(owner.authorization, viewId, {
			platforms: ""
		});

		assert.equal(onlySort.status, 200);
		assert.equal(onlySort.body.data.stats.totalEntries, 4);
		assert.equal(blankPlatforms.status, 200);
		assert.equal(blankPlatforms.body.data.stats.totalEntries, 4);
	});

	void it("ignores params the backlog does not know and keeps the saved filters", async () => {
		const { owner, viewId } = await seedLibrary();

		const response = await getStats(owner.authorization, viewId, {
			foo: "bar",
			savedFilterId: viewId
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.stats.totalEntries, 2);
	});

	void it("computes with the applied filters even when the stored ones are invalid", async () => {
		const owner = await createUserWithSession();
		const platform = await createPlatform();
		const game = await createGame();
		await createBacklog(owner.user.id, game.id, platform.id, {
			status: "playing"
		});
		const broken = await SavedFilter.create({
			userId: owner.user.id,
			name: "Broken",
			filters: { status: "paused" },
			position: 1
		});

		const response = await getStats(owner.authorization, broken.id, {
			status: "playing"
		});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.stats.totalEntries, 1);
	});

	void it("rejects garbage filter params with 422 COMMON_SCHEMA_INVALID", async () => {
		const { owner, viewId } = await seedLibrary();
		const garbage: Record<string, string | string[]>[] = [
			{ status: "paused" },
			{ status: "" },
			{ status: ["playing", "completed"] },
			{ min_ratio: "lots" },
			{ release_year_from: "1999.5" },
			{ started_from: "yesterday" },
			{ coop_only: "maybe" },
			{ sort_by: "DROP TABLE" },
			{ mood_tags: "," },
			{ search: "x".repeat(101) },
			{ limit: "0" }
		];

		for (const query of garbage) {
			const response = await getStats(owner.authorization, viewId, query);
			assert.equal(response.status, 422, JSON.stringify(query));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("answers 404 SAVED_FILTER_NOT_FOUND for another user's view or a missing one, with or without applied filters", async () => {
		const { viewId } = await seedLibrary();
		const intruder = await createUserWithSession();

		const requests = [
			getStats(intruder.authorization, viewId),
			getStats(intruder.authorization, viewId, { status: "completed" }),
			getStats(intruder.authorization, viewId, { platforms: "" }),
			getStats(intruder.authorization, randomUUID(), {
				status: "playing"
			})
		];

		for (const response of await Promise.all(requests)) {
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
		}
	});

	void it("answers each of many overlapping requests with its own filters and never changes the view", async () => {
		const { owner, viewId } = await seedLibrary();
		const overrides: { query: Record<string, string>; total: number }[] = [
			{ query: {}, total: 2 },
			{ query: { status: "playing" }, total: 1 },
			{ query: { mood_tags: "short" }, total: 2 },
			{ query: { sort_by: "title" }, total: 4 },
			{ query: { status: "completed", mood_tags: "cozy" }, total: 1 },
			{ query: { mood_tags: "cozy,short,nope" }, total: 0 }
		];
		const repeated = [
			...overrides,
			...overrides.toReversed(),
			...overrides
		];

		const results = await Promise.all(
			repeated.map(async ({ query, total }) => ({
				query,
				total,
				response: await getStats(owner.authorization, viewId, query)
			}))
		);

		for (const { query, total, response } of results) {
			assert.equal(response.status, 200);
			assert.equal(
				response.body.data.stats.totalEntries,
				total,
				JSON.stringify(query)
			);
		}
		const stored = await SavedFilter.findByPk(viewId);
		assert.deepEqual(stored?.filters, { status: "completed" });
	});
});

void describe("DELETE /users/me/saved-filters/:filterId", () => {
	void it("removes an owned filter", async () => {
		const owner = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.delete(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 204);
		assert.equal(await SavedFilter.count({ where: { id: filter.id } }), 0);
	});

	void it("rejects deleting another user's filter with 404 SAVED_FILTER_NOT_FOUND", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.delete(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
		assert.equal(await SavedFilter.count({ where: { id: filter.id } }), 1);
	});

	void it("answers 404 SAVED_FILTER_NOT_FOUND for an unknown filter", async () => {
		const owner = await createUserWithSession();

		const response = await api()
			.delete(`${FILTERS_PATH}/${randomUUID()}`)
			.set("Authorization", owner.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "SAVED_FILTER_NOT_FOUND");
	});
});
