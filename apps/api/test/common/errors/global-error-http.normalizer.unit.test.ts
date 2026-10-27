import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DomainError } from "../../../src/common/errors/domain-error";
import { globalErrorHttpNormalizer } from "../../../src/common/errors/global-error-http.normalizer";
import { fakeRequest } from "../../unit-helpers/http-fakes";

const statusTable: [string, string, number][] = [
	["Game Module", "GAME_NOT_FOUND", 404],
	["Game Module", "GAME_UNIQUE_CONSTRAINT", 409],
	["Backlog Module", "BACKLOG_FORBIDDEN", 403],
	["Backlog Module", "BACKLOG_UNIQUE_CONSTRAINT", 409],
	["Backlog Module", "BACKLOG_VALIDATION_ERROR", 400],
	["Auth Module", "AUTH_INVALID_CREDENTIALS", 401],
	["Auth Module", "AUTH_RATE_LIMITED", 429],
	["Auth Module", "AUTH_INVALID_PASSWORD_RESET_TOKEN", 400],
	["GameShelf Module", "GAME_SHELF_LIMIT_REACHED", 402],
	["Favorite Module", "FAVORITE_LIMIT_REACHED", 402],
	["Wishlist Module", "WISHLIST_LIMIT_REACHED", 402],
	["Queue Module", "QUEUE_LIMIT_REACHED", 402],
	["List Module", "LIST_LIMIT_REACHED", 402],
	["List Module", "LIST_FROZEN", 402],
	["ListItem Module", "LIST_ITEM_FROZEN", 402],
	["SavedFilter Module", "SAVED_FILTER_LIMIT_REACHED", 402],
	["SavedFilter Module", "SAVED_FILTER_FROZEN", 402],
	["MoodTags Module", "MOOD_TAGS_LIMIT_REACHED", 402],
	["Common Module", "COMMON_SCHEMA_INVALID", 422],
	["Common Module", "COMMON_RESOURCE_IN_USE", 409],
	["Common Module", "COMMON_REFERENCE_NOT_FOUND", 422],
	["Common Module", "EXPORT_FORMAT_PREMIUM", 402]
];

void describe("globalErrorHttpNormalizer", () => {
	for (const [module, code, status] of statusTable) {
		void it(`maps ${code} to HTTP ${status}`, () => {
			const httpError = globalErrorHttpNormalizer(
				new DomainError(module, code, "message"),
				fakeRequest()
			);

			assert.equal(httpError.status, status);
			assert.equal(httpError.type, code);
		});
	}

	void it("maps an unmapped code of a known module to 500", () => {
		const httpError = globalErrorHttpNormalizer(
			new DomainError("Game Module", "GAME_SOMETHING_NEW", "message"),
			fakeRequest()
		);

		assert.equal(httpError.status, 500);
	});

	void it("maps an unknown module to 500", () => {
		const httpError = globalErrorHttpNormalizer(
			new DomainError("Ghost Module", "GHOST", "message"),
			fakeRequest()
		);

		assert.equal(httpError.status, 500);
		assert.equal(httpError.type, "GHOST");
	});

	void it("routes the COMMON INTERNAL_ERROR fallback to 500", () => {
		const httpError = globalErrorHttpNormalizer(
			new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error"),
			fakeRequest()
		);

		assert.equal(httpError.status, 500);
	});

	void it("carries the request url, correlation id, context and issues", () => {
		const issues = [{ path: "name", code: "too_small", message: "short" }];

		const httpError = globalErrorHttpNormalizer(
			new DomainError(
				"Common Module",
				"COMMON_SCHEMA_INVALID",
				"Invalid request schema",
				{ extra: 1 },
				issues
			),
			fakeRequest({ originalUrl: "/games?x=1", correlationId: "abc" })
		);

		assert.equal(httpError.instance, "/games?x=1");
		assert.equal(httpError.correlationId, "abc");
		assert.deepEqual(httpError.context, { extra: 1 });
		assert.deepEqual(httpError.issues, issues);
	});
});
