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

void describe("franchisesService.registerFranchise", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("derives the code from the franchise name", async () => {
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

	void it("maps a unique violation to FRANCHISE_UNIQUE_CONSTRAINT", async () => {
		stub(Franchise, "create", async () => {
			throw new UniqueConstraintError({});
		});

		const error = await captureRejection(
			franchisesService.registerFranchise({ name: "Zelda" } as never)
		);

		assert.equal(errorCode(error), "FRANCHISE_UNIQUE_CONSTRAINT");
	});
});

void describe("franchisesService.updateFranchise", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with FRANCHISE_NOT_FOUND for a missing franchise", async () => {
		stub(Franchise, "findOne", async () => null);

		const error = await captureRejection(
			franchisesService.updateFranchise("f-1", { name: "X" } as never)
		);

		assert.equal(errorCode(error), "FRANCHISE_NOT_FOUND");
	});

	void it("regenerates the code from the new name", async () => {
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

	void it("maps a unique violation on update", async () => {
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

void describe("franchisesService.removeFranchise", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns false without deleting when the franchise does not exist", async () => {
		stub(Franchise, "findOne", async () => null);
		const destroy = stub(Franchise, "destroy", async () => 0);

		assert.equal(await franchisesService.removeFranchise("f-1"), false);
		assert.equal(destroy.mock.callCount(), 0);
	});

	void it("deletes an existing franchise", async () => {
		stub(Franchise, "findOne", async () => asModel({ id: "f-1" }));
		const destroy = stub(Franchise, "destroy", async () => 1);

		assert.equal(await franchisesService.removeFranchise("f-1"), true);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "f-1" } }
		]);
	});
});

void describe("franchisesService tracking", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("tracks a franchise idempotently with findOrCreate", async () => {
		const findOrCreate = stub(UserFranchise, "findOrCreate", async () => [
			{},
			false
		]);

		await franchisesService.trackFranchise("u-1", "f-1");

		assert.deepEqual(findOrCreate.mock.calls[0]?.arguments, [
			{ where: { userId: "u-1", franchiseId: "f-1" } }
		]);
	});

	void it("reports whether the user tracks a franchise", async () => {
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

	void it("lists the tracked franchise ids", async () => {
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

void describe("franchisesService.findTrackedFranchiseIdsAmong", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns an empty set without querying when no franchise is given", async () => {
		const find = stub(UserFranchise, "findAll", async () => []);

		assert.deepEqual(
			await franchisesService.findTrackedFranchiseIdsAmong("u-1", []),
			new Set()
		);
		assert.equal(find.mock.callCount(), 0);
	});

	void it("returns the given franchise ids the user tracks", async () => {
		stub(UserFranchise, "findAll", async () => [{ franchiseId: "f-2" }]);

		assert.deepEqual(
			await franchisesService.findTrackedFranchiseIdsAmong("u-1", [
				"f-1",
				"f-2"
			]),
			new Set(["f-2"])
		);
	});
});

void describe("franchisesService.findTrackedFranchises", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns nothing without querying franchises when none is tracked", async () => {
		stub(UserFranchise, "findAll", async () => []);
		const find = stub(Franchise, "findAll", async () => []);

		assert.deepEqual(
			await franchisesService.findTrackedFranchises("u-1"),
			[]
		);
		assert.equal(find.mock.callCount(), 0);
	});

	void it("returns each tracked franchise with its active game count", async () => {
		stub(UserFranchise, "findAll", async () => [
			{ franchiseId: "f-1" },
			{ franchiseId: "f-2" }
		]);
		stub(
			gamesSearchService,
			"countActiveGamesByFranchiseIds",
			async () => new Map([["f-1", 4]])
		);
		stub(Franchise, "findAll", async () => [
			{ id: "f-1", name: "One", code: "one" },
			{ id: "f-2", name: "Two", code: "two" }
		]);

		const franchises = await franchisesService.findTrackedFranchises("u-1");

		assert.deepEqual(
			franchises.map(entry => [entry.franchise.code, entry.gameCount]),
			[
				["one", 4],
				["two", 0]
			]
		);
	});
});
