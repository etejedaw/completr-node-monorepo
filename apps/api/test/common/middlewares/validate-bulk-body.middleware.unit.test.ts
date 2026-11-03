import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { type Request, type Response } from "express";
import z from "zod";

import { DomainError } from "../../../src/common/errors/domain-error";
import { validateBulkBodyMiddleware } from "../../../src/common/middlewares/validate-bulk-body.middleware";

const middleware = validateBulkBodyMiddleware({
	add: z.object({ gameIds: z.string().array() }).strict(),
	remove: z.object({ ids: z.string().array() }).strict()
});

function run(action: string, body: unknown) {
	const request = {
		locals: { query: { action } },
		body
	} as unknown as Request;
	const next = mock.fn();
	middleware(request, {} as Response, next);
	return { request, next };
}

function captureError(action: string, body: unknown) {
	try {
		run(action, body);
	} catch (error) {
		return error;
	}
	return undefined;
}

void describe("validateBulkBodyMiddleware", () => {
	void it("validates the body with the schema of the action and keeps the query", () => {
		const { request, next } = run("remove", { ids: ["a"] });

		assert.equal(next.mock.callCount(), 1);
		assert.deepEqual(request.locals.body, { ids: ["a"] });
		assert.deepEqual(request.locals.query, { action: "remove" });
	});

	void it("rejects the body of another action with COMMON_SCHEMA_INVALID", () => {
		const error = captureError("remove", { gameIds: ["a"] });

		assert.ok(error instanceof DomainError);
		assert.equal(error.code, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an action without a schema with COMMON_SCHEMA_INVALID", () => {
		const error = captureError("toString", { ids: ["a"] });

		assert.ok(error instanceof DomainError);
		assert.equal(error.code, "COMMON_SCHEMA_INVALID");
	});
});
