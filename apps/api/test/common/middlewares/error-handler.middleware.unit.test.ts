import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DomainError } from "../../../src/common/errors/domain-error";
import { ServiceError } from "../../../src/common/errors/service-error";
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
