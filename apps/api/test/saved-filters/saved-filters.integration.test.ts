import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

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

	void it("rejects editing another user's filter with 403 SAVED_FILTER_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id, { name: "Mine" });

		const response = await api()
			.patch(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", intruder.authorization)
			.send({ name: "Hijacked" });

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "SAVED_FILTER_FORBIDDEN");
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

	void it("rejects another user's filter with 403 SAVED_FILTER_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.get(`${FILTERS_PATH}/${filter.id}/stats`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "SAVED_FILTER_FORBIDDEN");
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

	void it("rejects deleting another user's filter with 403 SAVED_FILTER_FORBIDDEN", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const filter = await createSavedFilter(owner.user.id);

		const response = await api()
			.delete(`${FILTERS_PATH}/${filter.id}`)
			.set("Authorization", intruder.authorization);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "SAVED_FILTER_FORBIDDEN");
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
