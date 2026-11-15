import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { type Request } from "express";

import { DomainError } from "../../../src/common/errors/domain-error";
import { ServiceError } from "../../../src/common/errors/service-error";
import { PinoLogger } from "../../../src/common/logger/pino.logger";
import { errorHandlerMiddleware } from "../../../src/common/middlewares/error-handler.middleware";
import { asModel } from "../../unit-helpers/as-model";
import { fakeRequest, fakeResponse } from "../../unit-helpers/http-fakes";

function handle(error: Error, request = fakeRequest()) {
	const { response, captured } = fakeResponse();
	errorHandlerMiddleware(error, request, response, () => undefined);
	return captured;
}

void describe("errorHandlerMiddleware", () => {
	void it("responds with the status and problem details of a service error", () => {
		const captured = handle(
			new ServiceError("GAME_NOT_FOUND", {
				service: "Games Service",
				raw: undefined
			}),
			fakeRequest({ originalUrl: "/games/zelda", correlationId: "cid" })
		);

		assert.equal(captured.status, 404);
		assert.equal(captured.body?.type, "GAME_NOT_FOUND");
		assert.equal(captured.body?.status, 404);
		assert.equal(captured.body?.instance, "/games/zelda");
		assert.equal(captured.body?.correlationId, "cid");
		assert.ok(captured.body?.timestamp instanceof Date);
	});

	void it("responds 402 when a free limit service error reaches the handler", () => {
		const captured = handle(
			new ServiceError("GAME_SHELF_LIMIT_REACHED", {
				service: "GameShelf Service",
				raw: undefined
			})
		);

		assert.equal(captured.status, 402);
	});

	void it("responds with the issues of a schema validation domain error", () => {
		const issues = [{ path: "score", code: "too_big", message: "max 5" }];

		const captured = handle(
			new DomainError(
				"Common Module",
				"COMMON_SCHEMA_INVALID",
				"Invalid request schema",
				undefined,
				issues
			)
		);

		assert.equal(captured.status, 422);
		assert.deepEqual(captured.body?.issues, issues);
	});

	void it("omits issues when the error has none", () => {
		const captured = handle(
			new DomainError("Game Module", "GAME_NOT_FOUND", "Game not found")
		);

		assert.equal("issues" in (captured.body ?? {}), false);
	});

	void it("includes the context outside production", () => {
		const captured = handle(
			new DomainError("Game Module", "GAME_NOT_FOUND", "x", {
				gameId: "1"
			})
		);

		assert.deepEqual(captured.body?.context, { gameId: "1" });
	});

	void it("responds 500 INTERNAL_ERROR for unexpected errors", () => {
		const captured = handle(new Error("boom"));

		assert.equal(captured.status, 500);
		assert.equal(captured.body?.type, "INTERNAL_ERROR");
	});

	void it("falls back to an empty correlation id when the request has no locals", () => {
		const captured = handle(
			new Error("boom"),
			asModel({ originalUrl: "/x" })
		);

		assert.equal(captured.body?.correlationId, undefined);
		assert.equal(captured.status, 500);
	});
});

void describe("errorHandlerMiddleware logging", () => {
	function extraOf(callArguments: unknown[] | undefined) {
		return (callArguments?.[2] ?? {}) as Record<string, unknown>;
	}

	function handleLogged(
		error: Error,
		request = asModel<Request>({
			...fakeRequest({
				originalUrl: "/games?token=secret",
				correlationId: "cid"
			}),
			method: "POST",
			body: { password: "hunter2" }
		})
	) {
		const errorLog = mock.method(
			PinoLogger.prototype,
			"error",
			() => undefined
		);
		const warnLog = mock.method(
			PinoLogger.prototype,
			"warn",
			() => undefined
		);
		handle(error, request);
		const calls = {
			error: errorLog.mock.calls.map(call => call.arguments),
			warn: warnLog.mock.calls.map(call => call.arguments)
		};
		mock.restoreAll();
		return calls;
	}

	void it("logs an unexpected error at error level with stack, route and correlation id", () => {
		const calls = handleLogged(new Error("boom"));

		assert.equal(calls.error.length, 1);
		assert.equal(calls.warn.length, 0);
		const extra = extraOf(calls.error[0]);
		assert.equal(extra.correlationId, "cid");
		assert.equal(extra.method, "POST");
		assert.equal(extra.route, "/games");
		assert.equal(extra.status, 500);
		assert.equal(extra.code, "INTERNAL_ERROR");
		assert.equal(extra.cause, "boom");
		assert.match(String(extra.stack), /boom/);
	});

	void it("logs the raw cause of an unmapped service error", () => {
		const raw = new Error("connection reset");
		const calls = handleLogged(
			new ServiceError("SOMETHING_UNMAPPED", {
				service: "Unregistered Service",
				raw
			})
		);

		const extra = extraOf(calls.error[0]);
		assert.equal(extra.cause, "SOMETHING_UNMAPPED");
		assert.equal(extra.stack, raw.stack);
	});

	void it("never logs request bodies, query strings or tokens", () => {
		const calls = handleLogged(new Error("boom"));

		const serialized = JSON.stringify(calls.error);
		assert.equal(serialized.includes("hunter2"), false);
		assert.equal(serialized.includes("secret"), false);
	});

	void it("logs a client error at warn level without stack", () => {
		const calls = handleLogged(
			new DomainError(
				"Common Module",
				"COMMON_SCHEMA_INVALID",
				"Invalid request schema"
			)
		);

		assert.equal(calls.error.length, 0);
		assert.equal(calls.warn.length, 1);
		const extra = extraOf(calls.warn[0]);
		assert.equal(extra.status, 422);
		assert.equal("stack" in extra, false);
	});

	void it("stays silent for expected not found responses", () => {
		const calls = handleLogged(
			new ServiceError("GAME_NOT_FOUND", {
				service: "Games Service",
				raw: undefined
			})
		);

		assert.equal(calls.error.length, 0);
		assert.equal(calls.warn.length, 0);
	});

	void it("tolerates a request without method or url", () => {
		const calls = handleLogged(new Error("boom"), asModel<Request>({}));

		assert.equal(calls.error.length, 1);
	});
});
