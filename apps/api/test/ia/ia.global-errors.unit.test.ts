import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { globalErrorDomainNormalizer } from "../../src/common/errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../../src/common/errors/global-error-http.normalizer";
import { ServiceError } from "../../src/common/errors/service-error";
import * as iaServiceError from "../../src/ia/errors/ia.service-error";
import { fakeRequest } from "../unit-helpers/http-fakes";

const cases: [string, ServiceError, number][] = [
	["IA_NOT_CONFIGURED", iaServiceError.notConfiguredError(), 503],
	["IA_INVALID_INPUT", iaServiceError.invalidInputError("blank"), 422],
	[
		"IA_PROVIDER_UNAVAILABLE",
		iaServiceError.providerUnavailableError("HTTP 429"),
		502
	],
	["IA_TIMEOUT", iaServiceError.timeoutError(new Error("t")), 504],
	["IA_INVALID_RESPONSE", iaServiceError.invalidResponseError("empty"), 502]
];

void describe("IA errors through the global normalizers", () => {
	for (const [code, error, status] of cases) {
		void it(`${code} reaches the client as HTTP ${status}, not a generic 500`, () => {
			const domainError = globalErrorDomainNormalizer(error, "corr-1");
			const httpError = globalErrorHttpNormalizer(
				domainError,
				fakeRequest({ originalUrl: "/x", correlationId: "corr-1" })
			);

			assert.equal(domainError.module, "IA Provider");
			assert.equal(domainError.code, code);
			assert.equal(httpError.type, code);
			assert.equal(httpError.status, status);
			assert.equal(httpError.correlationId, "corr-1");
		});
	}

	void it("maps an unknown IA Provider code to IA_INTERNAL_ERROR with HTTP 500", () => {
		const domainError = globalErrorDomainNormalizer(
			new ServiceError("IA_SOMETHING_NEW", {
				service: "IA Provider",
				raw: undefined
			}),
			"corr-1"
		);
		const httpError = globalErrorHttpNormalizer(domainError, fakeRequest());

		assert.equal(domainError.code, "IA_INTERNAL_ERROR");
		assert.equal(httpError.status, 500);
	});
});
