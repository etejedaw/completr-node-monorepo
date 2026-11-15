import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { acquireAdvisoryLock } from "../../../src/common/utils/acquire-advisory-lock.util";
import { acquireAdvisoryLocks } from "../../../src/common/utils/acquire-advisory-locks.util";
import { compactPositions } from "../../../src/common/utils/compact-positions.util";
import { sequelize } from "../../../src/database/sequelize.database";
import { stub } from "../../unit-helpers/mocks";

const transaction = { id: "tx" } as never;

void describe("acquireAdvisoryLock", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("takes a transaction level advisory lock on the hashed key", async () => {
		const query = stub(sequelize, "query", async () => []);

		await acquireAdvisoryLock("queue:user-1", transaction);

		const [sql, options] = query.mock.calls[0]!.arguments;
		assert.equal(sql, "SELECT pg_advisory_xact_lock(hashtext(:lockKey))");
		assert.deepEqual(options, {
			replacements: { lockKey: "queue:user-1" },
			transaction
		});
	});
});

void describe("acquireAdvisoryLocks", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("takes every lock in one ordered query", async () => {
		const query = stub(sequelize, "query", async () => []);

		await acquireAdvisoryLocks(
			["list-items:b", "list-items:a"],
			transaction
		);

		assert.equal(query.mock.callCount(), 1);
		const [sql, options] = query.mock.calls[0]!.arguments;
		assert.match(String(sql), /pg_advisory_xact_lock\(hashtext\(/);
		assert.match(String(sql), /ORDER BY 1/);
		assert.deepEqual(options, {
			replacements: { lockKeys: ["list-items:b", "list-items:a"] },
			transaction
		});
	});

	void it("does not query without keys", async () => {
		const query = stub(sequelize, "query", async () => []);

		await acquireAdvisoryLocks([], transaction);

		assert.equal(query.mock.callCount(), 0);
	});
});

void describe("compactPositions", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("renumbers by owner keeping position, creation and id order", async () => {
		const query = stub(sequelize, "query", async () => []);

		await compactPositions({
			table: "Wishlists",
			ownerColumn: "userId",
			ownerIds: ["user-1"],
			transaction
		});

		const [sql, options] = query.mock.calls[0]!.arguments;
		assert.match(String(sql), /UPDATE "Wishlists" AS target/);
		assert.match(
			String(sql),
			/ROW_NUMBER\(\) OVER \(PARTITION BY "userId" ORDER BY "position", "createdAt", "id"\)/
		);
		assert.match(String(sql), /WHERE "userId" IN \(:ownerIds\)/);
		assert.deepEqual(options, {
			replacements: { ownerIds: ["user-1"] },
			transaction
		});
	});
});
