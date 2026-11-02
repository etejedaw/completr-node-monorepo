import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { globalErrorDomainNormalizer } from "../../src/common/errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../../src/common/errors/global-error-http.normalizer";
import { ServiceError } from "../../src/common/errors/service-error";
import { ScrapingRequestError } from "../../src/scraping/errors/scraping-request.error";
import { type ScrapingFailureKind } from "../../src/scraping/scraping.types";
import { wikidataDomainToHttpMapper } from "../../src/wikidata/errors/wikidata.domain-to-http.mapper";
import { wikidataErrorDomainNormalizer } from "../../src/wikidata/errors/wikidata.error-domain.normalizer";
import * as wikidataServiceError from "../../src/wikidata/errors/wikidata.service-error";
import { wikidataServiceToDomainMapper } from "../../src/wikidata/errors/wikidata.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";
import { fakeRequest } from "../unit-helpers/http-fakes";

const SERVICE = "Wikidata Provider";

describeModuleErrors({
	name: "Wikidata",
	service: SERVICE,
	mapper: wikidataServiceToDomainMapper,
	normalizer: wikidataErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "WIKIDATA_PARSE_ERROR",
			module: SERVICE,
			code: "WIKIDATA_PARSE_ERROR",
			message: "Unexpected Wikidata response structure"
		},
		{
			serviceCode: "WIKIDATA_RATE_LIMITED",
			module: SERVICE,
			code: "WIKIDATA_RATE_LIMITED",
			message: "Wikidata rate limit reached"
		},
		{
			serviceCode: "WIKIDATA_BLOCKED",
			module: SERVICE,
			code: "WIKIDATA_BLOCKED",
			message: "Wikidata blocked the request"
		},
		{
			serviceCode: "WIKIDATA_TIMEOUT",
			module: SERVICE,
			code: "WIKIDATA_TIMEOUT",
			message: "Wikidata request timed out"
		},
		{
			serviceCode: "WIKIDATA_ABORTED",
			module: SERVICE,
			code: "WIKIDATA_ABORTED",
			message: "Wikidata request was aborted"
		},
		{
			serviceCode: "WIKIDATA_REQUEST_ERROR",
			module: SERVICE,
			code: "WIKIDATA_REQUEST_ERROR",
			message: "Wikidata request failed"
		}
	],
	fallback: {
		module: SERVICE,
		code: "WIKIDATA_INTERNAL_ERROR",
		message: "Unexpected Wikidata Provider error"
	}
});

const HTTP_STATUSES = [
	{ code: "WIKIDATA_RATE_LIMITED", status: 429 },
	{ code: "WIKIDATA_REQUEST_ERROR", status: 502 },
	{ code: "WIKIDATA_PARSE_ERROR", status: 502 },
	{ code: "WIKIDATA_BLOCKED", status: 502 },
	{ code: "WIKIDATA_TIMEOUT", status: 504 },
	{ code: "WIKIDATA_ABORTED", status: 504 }
];

describeDomainToHttpMapper({
	name: "Wikidata",
	mapper: wikidataDomainToHttpMapper,
	cases: HTTP_STATUSES
});

void describe("Wikidata errors through the global normalizers", () => {
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

void describe("wikidataServiceError.fromRequestFailure", () => {
	const expectedCodeByKind: Record<ScrapingFailureKind, string> = {
		NOT_FOUND: "WIKIDATA_REQUEST_ERROR",
		RATE_LIMITED: "WIKIDATA_RATE_LIMITED",
		BLOCKED: "WIKIDATA_BLOCKED",
		TIMEOUT: "WIKIDATA_TIMEOUT",
		ABORTED: "WIKIDATA_ABORTED",
		REQUEST_ERROR: "WIKIDATA_REQUEST_ERROR"
	};

	for (const [kind, code] of Object.entries(expectedCodeByKind)) {
		void it(`maps a ${kind} request failure to ${code}`, () => {
			const error = wikidataServiceError.fromRequestFailure(
				new ScrapingRequestError(kind as ScrapingFailureKind, {
					url: "https://x",
					attempts: 1
				})
			);

			assert.equal(error.code, code);
			assert.equal(error.serviceError.service, SERVICE);
			assert.deepEqual(error.serviceError.raw, {
				kind,
				url: "https://x",
				attempts: 1
			});
		});
	}

	void it("maps an unexpected error to WIKIDATA_REQUEST_ERROR", () => {
		const raw = new Error("boom");
		const error = wikidataServiceError.fromRequestFailure(raw);

		assert.equal(error.code, "WIKIDATA_REQUEST_ERROR");
		assert.equal(error.serviceError.raw, raw);
	});
});
