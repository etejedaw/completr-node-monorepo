import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { globalErrorDomainNormalizer } from "../../src/common/errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../../src/common/errors/global-error-http.normalizer";
import { ServiceError } from "../../src/common/errors/service-error";
import { metacriticDomainToHttpMapper } from "../../src/metacritic/errors/metacritic.domain-to-http.mapper";
import { metacriticErrorDomainNormalizer } from "../../src/metacritic/errors/metacritic.error-domain.normalizer";
import * as metacriticServiceError from "../../src/metacritic/errors/metacritic.service-error";
import { metacriticServiceToDomainMapper } from "../../src/metacritic/errors/metacritic.service-to-domain.mapper";
import { ScrapingRequestError } from "../../src/scraping/errors/scraping-request.error";
import { type ScrapingFailureKind } from "../../src/scraping/scraping.types";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";
import { fakeRequest } from "../unit-helpers/http-fakes";

const SERVICE = "Metacritic Provider";

describeModuleErrors({
	name: "Metacritic",
	service: SERVICE,
	mapper: metacriticServiceToDomainMapper,
	normalizer: metacriticErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "METACRITIC_NOT_FOUND",
			module: SERVICE,
			code: "METACRITIC_NOT_FOUND",
			message: "Game not found in Metacritic"
		},
		{
			serviceCode: "METACRITIC_PARSE_ERROR",
			module: SERVICE,
			code: "METACRITIC_PARSE_ERROR",
			message: "Unexpected Metacritic page structure"
		},
		{
			serviceCode: "METACRITIC_RATE_LIMITED",
			module: SERVICE,
			code: "METACRITIC_RATE_LIMITED",
			message: "Metacritic rate limit reached"
		},
		{
			serviceCode: "METACRITIC_BLOCKED",
			module: SERVICE,
			code: "METACRITIC_BLOCKED",
			message: "Metacritic blocked the request"
		},
		{
			serviceCode: "METACRITIC_TIMEOUT",
			module: SERVICE,
			code: "METACRITIC_TIMEOUT",
			message: "Metacritic request timed out"
		},
		{
			serviceCode: "METACRITIC_REQUEST_ERROR",
			module: SERVICE,
			code: "METACRITIC_REQUEST_ERROR",
			message: "Metacritic request failed"
		}
	],
	fallback: {
		module: SERVICE,
		code: "METACRITIC_INTERNAL_ERROR",
		message: "Unexpected Metacritic Provider error"
	}
});

const HTTP_STATUSES = [
	{ code: "METACRITIC_NOT_FOUND", status: 404 },
	{ code: "METACRITIC_RATE_LIMITED", status: 429 },
	{ code: "METACRITIC_REQUEST_ERROR", status: 502 },
	{ code: "METACRITIC_PARSE_ERROR", status: 502 },
	{ code: "METACRITIC_BLOCKED", status: 502 },
	{ code: "METACRITIC_TIMEOUT", status: 504 }
];

describeDomainToHttpMapper({
	name: "Metacritic",
	mapper: metacriticDomainToHttpMapper,
	cases: HTTP_STATUSES
});

void describe("Metacritic errors through the global normalizers", () => {
	for (const { code, status } of HTTP_STATUSES) {
		void it(`${code} reaches the client as HTTP ${status}, not a generic 500`, () => {
			const domainError = globalErrorDomainNormalizer(
				new ServiceError(code, { service: SERVICE, raw: undefined }),
				"corr-1"
			);
			const httpError = globalErrorHttpNormalizer(
				domainError,
				fakeRequest({ originalUrl: "/x", correlationId: "corr-1" })
			);

			assert.equal(domainError.module, SERVICE);
			assert.equal(domainError.code, code);
			assert.equal(httpError.type, code);
			assert.equal(httpError.status, status);
		});
	}
});

void describe("metacriticServiceError.fromRequestFailure", () => {
	const kinds: ScrapingFailureKind[] = [
		"NOT_FOUND",
		"RATE_LIMITED",
		"BLOCKED",
		"TIMEOUT",
		"REQUEST_ERROR"
	];

	for (const kind of kinds) {
		void it(`maps a ${kind} request failure to METACRITIC_${kind}`, () => {
			const error = metacriticServiceError.fromRequestFailure(
				new ScrapingRequestError(kind, {
					url: "https://x",
					attempts: 1
				})
			);

			assert.equal(error.code, `METACRITIC_${kind}`);
			assert.equal(error.serviceError.service, SERVICE);
			assert.deepEqual(error.serviceError.raw, {
				kind,
				url: "https://x",
				attempts: 1
			});
		});
	}

	void it("maps an unexpected error to METACRITIC_REQUEST_ERROR", () => {
		const raw = new Error("boom");
		const error = metacriticServiceError.fromRequestFailure(raw);

		assert.equal(error.code, "METACRITIC_REQUEST_ERROR");
		assert.equal(error.serviceError.raw, raw);
	});
});
