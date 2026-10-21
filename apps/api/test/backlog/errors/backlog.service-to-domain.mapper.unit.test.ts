import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as backlogServiceError from "../../../src/backlog/errors/backlog.service-error";
import { backlogServiceToDomainMapper } from "../../../src/backlog/errors/backlog.service-to-domain.mapper";
import { ServiceError } from "../../../src/common/errors/service-error";

void describe("backlogServiceToDomainMapper", () => {
	void it("maps BACKLOG_UNIQUE_CONSTRAINT to its own domain error", () => {
		const rawError = new Error("duplicate");

		const domainError = backlogServiceToDomainMapper(
			backlogServiceError.uniqueConstraintError(rawError),
			"correlation-1"
		);

		assert.equal(domainError.module, "Backlog Module");
		assert.equal(domainError.code, "BACKLOG_UNIQUE_CONSTRAINT");
		assert.equal(domainError.context?.correlationId, "correlation-1");
		assert.equal(domainError.context?.raw, rawError);
	});

	void it("falls back to BACKLOG_INTERNAL_ERROR for unknown codes", () => {
		const domainError = backlogServiceToDomainMapper(
			new ServiceError("BACKLOG_UNKNOWN", {
				service: "Backlog Service",
				raw: undefined
			}),
			"correlation-1"
		);

		assert.equal(domainError.code, "BACKLOG_INTERNAL_ERROR");
	});

	void it("rethrows errors that are not ServiceErrors", () => {
		const error = new Error("boom");

		assert.throws(
			() => backlogServiceToDomainMapper(error, "correlation-1"),
			error
		);
	});
});
