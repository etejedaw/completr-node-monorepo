/// <reference types="node" />

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { UniqueConstraintError } from "sequelize";

import { Franchise } from "../../src/franchises/franchise.model";
import * as franchisesService from "../../src/franchises/franchises.service";
import { UserFranchise } from "../../src/franchises/user-franchise.model";
import * as gamesSearchService from "../../src/games/services/games-search.service";
import { asModel } from "../unit-helpers/as-model";
import { captureRejection, spy, stub } from "../unit-helpers/mocks";

function errorCode(error: unknown) {
	return (error as { code: string }).code;
}

describe("franchisesService.registerFranchise", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("derives the code from the franchise name", async () => {
		const create = stub(
			Franchise,
			"create",
			async (values: object) => values
		);

		await franchisesService.registerFranchise({
			name: "The Legend of Zelda"
		} as never);

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			name: "The Legend of Zelda",
			code: "the-legend-of-zelda"
		});
	});

	it("maps a unique violation to FRANCHISE_UNIQUE_CONSTRAINT", async () => {
		stub(Franchise, "create", async () => {
			throw new UniqueConstraintError({});
		});

		const error = await captureRejection(
			franchisesService.registerFranchise({ name: "Zelda" } as never)
		);

		assert.equal(errorCode(error), "FRANCHISE_UNIQUE_CONSTRAINT");
	});
});

describe("franchisesService.updateFranchise", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("fails with FRANCHISE_NOT_FOUND for a missing franchise", async () => {
		stub(Franchise, "findOne", async () => null);

		const error = await captureRejection(
			franchisesService.updateFranchise("f-1", { name: "X" } as never)
		);

		assert.equal(errorCode(error), "FRANCHISE_NOT_FOUND");
	});

	it("regenerates the code from the new name", async () => {
		const update = spy();
		const franchise = asModel({ update });
		stub(Franchise, "findOne", async () => franchise);

		const result = await franchisesService.updateFranchise("f-1", {
			name: "Super Mario"
		} as never);

		assert.equal(result, franchise);
		assert.deepEqual(update.mock.calls[0]?.arguments, [
			{ name: "Super Mario", code: "super-mario" }
		]);
	});

	it("maps a unique violation on update", async () => {
		stub(Franchise, "findOne", async () =>
			asModel({
				update: async () => {
					throw new UniqueConstraintError({});
				}
			})
		);

		const error = await captureRejection(
			franchisesService.updateFranchise("f-1", { name: "X" } as never)
		);

		assert.equal(errorCode(error), "FRANCHISE_UNIQUE_CONSTRAINT");
	});
});

describe("franchisesService.removeFranchise", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("returns false without deleting when the franchise does not exist", async () => {
		stub(Franchise, "findOne", async () => null);
		const destroy = stub(Franchise, "destroy", async () => 0);

		assert.equal(await franchisesService.removeFranchise("f-1"), false);
		assert.equal(destroy.mock.callCount(), 0);
	});

	it("deletes an existing franchise", async () => {
		stub(Franchise, "findOne", async () => asModel({ id: "f-1" }));
		const destroy = stub(Franchise, "destroy", async () => 1);

		assert.equal(await franchisesService.removeFranchise("f-1"), true);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "f-1" } }
		]);
	});
});

describe("franchisesService tracking", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("tracks a franchise idempotently with findOrCreate", async () => {
		const findOrCreate = stub(UserFranchise, "findOrCreate", async () => [
			{},
			false
		]);

		await franchisesService.trackFranchise("u-1", "f-1");

		assert.deepEqual(findOrCreate.mock.calls[0]?.arguments, [
			{ where: { userId: "u-1", franchiseId: "f-1" } }
		]);
	});

	it("reports whether the user tracks a franchise", async () => {
		stub(UserFranchise, "findOne", async () => asModel({ id: "x" }));
		assert.equal(
			await franchisesService.isTrackingFranchise("u-1", "f-1"),
			true
		);
		mock.restoreAll();

		stub(UserFranchise, "findOne", async () => null);
		assert.equal(
			await franchisesService.isTrackingFranchise("u-1", "f-1"),
			false
		);
	});

	it("lists the tracked franchise ids", async () => {
		stub(UserFranchise, "findAll", async () => [
			{ franchiseId: "f-1" },
			{ franchiseId: "f-2" }
		]);

		assert.deepEqual(
			await franchisesService.findTrackedFranchiseIds("u-1"),
			["f-1", "f-2"]
		);
	});
});

describe("franchisesService.findTrackedFranchiseProgress", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("returns nothing without querying when no franchise is tracked", async () => {
		const find = stub(Franchise, "findAll", async () => []);

		assert.deepEqual(
			await franchisesService.findTrackedFranchiseProgress([], ["g-1"]),
			[]
		);
		assert.equal(find.mock.callCount(), 0);
	});

	it("counts completed games per franchise and sorts by completed descending", async () => {
		stub(gamesSearchService, "findFranchiseIdsForGameIds", async () => [
			"f-2",
			"f-2",
			"f-1"
		]);
		stub(
			gamesSearchService,
			"countActiveGamesByFranchiseIds",
			async () =>
				new Map([
					["f-1", 4],
					["f-2", 3]
				])
		);
		stub(Franchise, "findAll", async () => [
			{ id: "f-1", name: "One", code: "one" },
			{ id: "f-2", name: "Two", code: "two" },
			{ id: "f-3", name: "Three", code: "three" }
		]);

		const progress = await franchisesService.findTrackedFranchiseProgress(
			["f-1", "f-2", "f-3"],
			["g-1", "g-2", "g-3"]
		);

		assert.deepEqual(
			progress.map(entry => [
				entry.franchise.code,
				entry.completed,
				entry.total
			]),
			[
				["two", 2, 3],
				["one", 1, 4],
				["three", 0, 0]
			]
		);
	});
});
