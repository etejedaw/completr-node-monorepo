import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	bodyParserErrorMapper,
	isBodyParserError
} from "../../../src/common/errors/body-parser-error.mapper";
import { globalErrorDomainNormalizer } from "../../../src/common/errors/global-error-domain.normalizer";

function bodyParserError(type: string, status: number) {
	return Object.assign(new SyntaxError("Unexpected end of JSON input"), {
		type,
		status,
		expose: true
	});
}

void describe("bodyParserErrorMapper", () => {
	void it("maps entity.parse.failed to COMMON_INVALID_JSON", () => {
		const domainError = bodyParserErrorMapper(
			bodyParserError("entity.parse.failed", 400),
			"c"
		);

		assert.equal(domainError.code, "COMMON_INVALID_JSON");
		assert.equal(domainError.module, "Common Module");
		assert.deepEqual(domainError.context, { correlationId: "c" });
	});

	void it("maps entity.too.large to COMMON_PAYLOAD_TOO_LARGE", () => {
		const domainError = bodyParserErrorMapper(
			bodyParserError("entity.too.large", 413),
			"c"
		);

		assert.equal(domainError.code, "COMMON_PAYLOAD_TOO_LARGE");
	});

	void it("recognizes only the body-parser types it maps", () => {
		assert.equal(
			isBodyParserError(bodyParserError("entity.parse.failed", 400)),
			true
		);
		assert.equal(
			isBodyParserError(bodyParserError("encoding.unsupported", 415)),
			false
		);
		assert.equal(isBodyParserError({ type: 42 }), false);
		assert.equal(isBodyParserError("entity.parse.failed"), false);
		assert.equal(isBodyParserError(null), false);
		assert.equal(isBodyParserError(undefined), false);
	});
});

void describe("globalErrorDomainNormalizer with body-parser errors", () => {
	void it("routes a malformed JSON body to COMMON_INVALID_JSON", () => {
		const domainError = globalErrorDomainNormalizer(
			bodyParserError("entity.parse.failed", 400),
			"c"
		);

		assert.equal(domainError.code, "COMMON_INVALID_JSON");
	});

	void it("keeps any other SyntaxError as an internal error", () => {
		const domainError = globalErrorDomainNormalizer(
			new SyntaxError("boom"),
			"c"
		);

		assert.equal(domainError.code, "INTERNAL_ERROR");
	});
});
