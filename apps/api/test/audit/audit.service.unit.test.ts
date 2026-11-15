import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import * as auditService from "../../src/audit/audit.service";
import { PinoLogger } from "../../src/common/logger/pino.logger";

const SETTLE_MS = 20;

function settle() {
	return new Promise(resolve => setTimeout(resolve, SETTLE_MS));
}

void describe("auditService.record", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("logs a warning instead of swallowing a failed write", async () => {
		mock.method(AuditLog, "create", async () => {
			throw new Error("db down");
		});
		const warn = mock.method(PinoLogger.prototype, "warn", () => undefined);

		auditService.record("admin-id", "user_edited", "user", "target-id");
		await settle();

		assert.equal(warn.mock.callCount(), 1);
		const [operation, result, extra] = warn.mock.calls[0]!.arguments;
		assert.equal(operation, "record");
		assert.equal(result, "failed");
		assert.deepEqual(extra, { action: "user_edited", error: "db down" });
	});
});
