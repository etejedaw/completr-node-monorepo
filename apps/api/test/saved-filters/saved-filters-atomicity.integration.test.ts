import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SavedFilter } from "../../src/saved-filters/saved-filter.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createSavedFilter } from "../helpers/factories.helper";

const FILTERS_PATH = "/users/me/saved-filters";
const FREE_FILTER_LIMIT = 5;
const SIMULTANEOUS_REQUESTS = 6;

useTestDatabase();

function postFilter(authorization: string, body: Record<string, unknown>) {
	return api()
		.post(FILTERS_PATH)
		.set("Authorization", authorization)
		.send(body);
}

async function positionsOf(userId: string) {
	const filters = await SavedFilter.findAll({
		where: { userId },
		order: [["position", "ASC"]]
	});
	return filters.map(filter => filter.position);
}

void describe("saved filters under concurrent requests", () => {
	void it("never exceeds the free limit nor repeats positions when creates race", async () => {
		const owner = await createUserWithSession();
		for (let index = 0; index < FREE_FILTER_LIMIT - 2; index++)
			await createSavedFilter(owner.user.id, { position: index + 1 });

		const responses = await Promise.all(
			Array.from({ length: SIMULTANEOUS_REQUESTS }, (_, index) =>
				postFilter(owner.authorization, {
					name: `Racing ${index}`,
					filters: {}
				})
			)
		);

		assert.equal(responses.filter(r => r.status === 201).length, 2);
		assert.deepEqual(
			await positionsOf(owner.user.id),
			Array.from({ length: FREE_FILTER_LIMIT }, (_, index) => index + 1)
		);
	});

	void it("leaves a single default filter when several defaults race", async () => {
		const owner = await createUserWithSession();

		await Promise.all(
			[0, 1, 2].map(index =>
				postFilter(owner.authorization, {
					name: `Default ${index}`,
					filters: {},
					isDefault: true
				})
			)
		);

		assert.equal(
			await SavedFilter.count({
				where: { userId: owner.user.id, isDefault: true }
			}),
			1
		);
	});

	void it("keeps unique consecutive positions when only some filters are reordered", async () => {
		const owner = await createUserWithSession();
		const [first, second, third, fourth] = await Promise.all(
			[1, 2, 3, 4].map(position =>
				createSavedFilter(owner.user.id, { position })
			)
		);

		const response = await api()
			.put(`${FILTERS_PATH}/reorder`)
			.set("Authorization", owner.authorization)
			.send({ ids: [fourth!.id, second!.id] });

		assert.equal(response.status, 200);
		assert.deepEqual(await positionsOf(owner.user.id), [1, 2, 3, 4]);
		const ordered = await SavedFilter.findAll({
			where: { userId: owner.user.id },
			order: [["position", "ASC"]]
		});
		assert.deepEqual(
			ordered.map(filter => filter.id),
			[fourth!.id, second!.id, first!.id, third!.id]
		);
	});

	void it("rejects duplicated ids in a reorder and keeps the order", async () => {
		const owner = await createUserWithSession();
		const [first, second] = await Promise.all(
			[1, 2].map(position =>
				createSavedFilter(owner.user.id, { position })
			)
		);

		const response = await api()
			.put(`${FILTERS_PATH}/reorder`)
			.set("Authorization", owner.authorization)
			.send({ ids: [second!.id, second!.id] });

		assert.equal(response.status, 422);
		const ordered = await SavedFilter.findAll({
			where: { userId: owner.user.id },
			order: [["position", "ASC"]]
		});
		assert.deepEqual(
			ordered.map(filter => filter.id),
			[first!.id, second!.id]
		);
	});
});
