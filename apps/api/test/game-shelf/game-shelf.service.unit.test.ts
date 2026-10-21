import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { UniqueConstraintError, ValidationError } from "sequelize";

import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import * as gameShelfService from "../../src/game-shelf/game-shelf.service";
import { asModel } from "../unit-helpers/as-model";
import {
	buildRequestUser,
	captureRejection,
	spy,
	stub
} from "../unit-helpers/mocks";

const FREE_SHELF_LIMIT = 250;
const dto = { gameId: "game-1", platformId: "platform-1" };

function stubShelfEntry(userId: string) {
	const update = spy();
	stub(GameShelf, "findOne", async () =>
		asModel({ id: "gs-1", userId, update })
	);
	return update;
}

void describe("gameShelfService.registerGameShelf", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("creates the entry for the requesting user", async () => {
		stub(GameShelf, "count", async () => 0);
		const create = stub(
			GameShelf,
			"create",
			async (values: object) => values
		);

		await gameShelfService.registerGameShelf(
			buildRequestUser({ id: "u-9" }),
			dto as never
		);

		assert.deepEqual(create.mock.calls[0]?.arguments[0], {
			...dto,
			userId: "u-9"
		});
	});

	void it("allows a free user one below the limit", async () => {
		stub(GameShelf, "count", async () => FREE_SHELF_LIMIT - 1);
		const create = stub(GameShelf, "create", async () => ({}));

		await gameShelfService.registerGameShelf(
			buildRequestUser(),
			dto as never
		);

		assert.equal(create.mock.callCount(), 1);
	});

	void it("rejects a free user at the limit with GAME_SHELF_LIMIT_REACHED", async () => {
		stub(GameShelf, "count", async () => FREE_SHELF_LIMIT);
		const create = stub(GameShelf, "create", async () => ({}));

		const error = await captureRejection(
			gameShelfService.registerGameShelf(buildRequestUser(), dto as never)
		);

		assert.equal(
			(error as { code: string }).code,
			"GAME_SHELF_LIMIT_REACHED"
		);
		assert.equal(create.mock.callCount(), 0);
	});

	void it("does not count the shelf of premium, moderator and admin users", async () => {
		const count = stub(GameShelf, "count", async () => 10_000);
		stub(GameShelf, "create", async () => ({}));

		for (const role of ["premium", "moderator", "admin"]) {
			await gameShelfService.registerGameShelf(
				buildRequestUser({ role }),
				dto as never
			);
		}

		assert.equal(count.mock.callCount(), 0);
	});

	void it("maps unique constraint errors to GAME_SHELF_UNIQUE_CONSTRAINT", async () => {
		stub(GameShelf, "count", async () => 0);
		stub(GameShelf, "create", async () => {
			throw new UniqueConstraintError({});
		});

		const error = await captureRejection(
			gameShelfService.registerGameShelf(buildRequestUser(), dto as never)
		);

		assert.equal(
			(error as { code: string }).code,
			"GAME_SHELF_UNIQUE_CONSTRAINT"
		);
	});

	void it("maps validation errors to GAME_SHELF_VALIDATION_ERROR", async () => {
		stub(GameShelf, "count", async () => 0);
		stub(GameShelf, "create", async () => {
			throw new ValidationError("bad", []);
		});

		const error = await captureRejection(
			gameShelfService.registerGameShelf(buildRequestUser(), dto as never)
		);

		assert.equal(
			(error as { code: string }).code,
			"GAME_SHELF_VALIDATION_ERROR"
		);
	});

	void it("rethrows unexpected database errors untouched", async () => {
		const boom = new Error("connection lost");
		stub(GameShelf, "count", async () => 0);
		stub(GameShelf, "create", async () => {
			throw boom;
		});

		const error = await captureRejection(
			gameShelfService.registerGameShelf(buildRequestUser(), dto as never)
		);

		assert.equal(error, boom);
	});
});

void describe("gameShelfService.updateGameShelf", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("fails with GAME_SHELF_NOT_FOUND when the entry does not exist", async () => {
		stub(GameShelf, "findOne", async () => null);

		const error = await captureRejection(
			gameShelfService.updateGameShelf("gs-1", "u-1", {})
		);

		assert.equal((error as { code: string }).code, "GAME_SHELF_NOT_FOUND");
	});

	void it("fails with GAME_SHELF_FORBIDDEN when the entry belongs to someone else", async () => {
		const update = stubShelfEntry("owner");

		const error = await captureRejection(
			gameShelfService.updateGameShelf("gs-1", "intruder", { notes: "x" })
		);

		assert.equal((error as { code: string }).code, "GAME_SHELF_FORBIDDEN");
		assert.equal(update.mock.callCount(), 0);
	});

	void it("updates the entry of its owner", async () => {
		const update = stubShelfEntry("owner");

		await gameShelfService.updateGameShelf("gs-1", "owner", { notes: "x" });

		assert.deepEqual(update.mock.calls[0]?.arguments, [{ notes: "x" }]);
	});
});

void describe("gameShelfService.removeGameShelf", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("returns false when the entry does not exist", async () => {
		stub(GameShelf, "findOne", async () => null);
		const destroy = stub(GameShelf, "destroy", async () => 0);

		assert.equal(
			await gameShelfService.removeGameShelf("gs-1", "u-1"),
			false
		);
		assert.equal(destroy.mock.callCount(), 0);
	});

	void it("returns false and keeps the entry when it belongs to someone else", async () => {
		stubShelfEntry("owner");
		const destroy = stub(GameShelf, "destroy", async () => 0);

		assert.equal(
			await gameShelfService.removeGameShelf("gs-1", "intruder"),
			false
		);
		assert.equal(destroy.mock.callCount(), 0);
	});

	void it("deletes the entry scoped by id and owner", async () => {
		stubShelfEntry("owner");
		const destroy = stub(GameShelf, "destroy", async () => 1);

		assert.equal(
			await gameShelfService.removeGameShelf("gs-1", "owner"),
			true
		);
		assert.deepEqual(destroy.mock.calls[0]?.arguments, [
			{ where: { id: "gs-1", userId: "owner" } }
		]);
	});
});

void describe("gameShelfService public shelf queries", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("only fetches public entries for other viewers", async () => {
		const findAndCountAll = stub(
			GameShelf,
			"findAndCountAll",
			async () => ({ rows: [], count: 0 })
		);

		await gameShelfService.findPublicGameShelfByUserId("u-1", {
			limit: 5,
			offset: 10
		});

		const query = findAndCountAll.mock.calls[0]?.arguments[0] as Record<
			string,
			unknown
		>;
		assert.deepEqual(query.where, { userId: "u-1", isPublic: true });
		assert.equal(query.limit, 5);
		assert.equal(query.offset, 10);
	});

	void it("includes private entries of the owner and filters by title when searching", async () => {
		const findAndCountAll = stub(
			GameShelf,
			"findAndCountAll",
			async () => ({ rows: [], count: 3 })
		);

		const result = await gameShelfService.findGameShelfByUserIdPaginated(
			"u-1",
			{ search: "zelda" }
		);

		const query = findAndCountAll.mock.calls[0]?.arguments[0] as {
			where: Record<string, unknown>;
			include: { where?: unknown }[];
		};
		assert.deepEqual(query.where, { userId: "u-1" });
		assert.notEqual(query.include[0]?.where, undefined);
		assert.equal(result.total, 3);
	});

	void it("restricts game entries to public ones when asked", async () => {
		const findAll = stub(GameShelf, "findAll", async () => []);

		await gameShelfService.findGameEntriesByUserId("u-1", true, ["g-1"]);
		await gameShelfService.findGameEntriesByUserId("u-1", false);

		const publicWhere = (
			findAll.mock.calls[0]?.arguments[0] as {
				where: Record<string, unknown>;
			}
		).where;
		const privateWhere = (
			findAll.mock.calls[1]?.arguments[0] as {
				where: Record<string, unknown>;
			}
		).where;
		assert.equal(publicWhere.isPublic, true);
		assert.notEqual(publicWhere.gameId, undefined);
		assert.equal("isPublic" in privateWhere, false);
	});
});
