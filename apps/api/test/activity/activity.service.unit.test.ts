import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { Activity } from "../../src/activity/activity.model";
import * as activityService from "../../src/activity/activity.service";
import { PinoLogger } from "../../src/common/logger/pino.logger";
import { sequelize } from "../../src/database/sequelize.database";

const SETTLE_MS = 20;

function settle() {
	return new Promise(resolve => setTimeout(resolve, SETTLE_MS));
}

void describe("activityService.record", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("logs a warning when the write fails and never throws to the caller", async () => {
		mock.method(sequelize, "transaction", async () => {
			throw new Error("db down");
		});
		const warn = mock.method(PinoLogger.prototype, "warn", () => undefined);

		assert.doesNotThrow(() =>
			activityService.record("user-id", "backlog_added", "game-id")
		);
		await settle();

		assert.equal(warn.mock.callCount(), 1);
		assert.equal(warn.mock.calls[0]!.arguments[0], "record");
		assert.equal(warn.mock.calls[0]!.arguments[1], "failed");
	});

	void it("writes the activity and its target inside one transaction", async () => {
		const transaction = { id: "tx" };
		const transactionMock = mock.method(
			sequelize,
			"transaction",
			async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(transaction)
		);
		const create = mock.method(Activity, "create", async () => {
			throw new Error("target not reached");
		});

		activityService.record("user-id", "backlog_added", "game-id");
		await settle();

		assert.equal(transactionMock.mock.callCount(), 1);
		assert.equal(
			create.mock.calls[0]!.arguments[1]?.transaction,
			transaction
		);
	});
});
