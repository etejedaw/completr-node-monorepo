import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { globalErrorDomainNormalizer } from "../../src/common/errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../../src/common/errors/global-error-http.normalizer";
import { ServiceError } from "../../src/common/errors/service-error";
import { hltbDomainToHttpMapper } from "../../src/hltb/errors/hltb.domain-to-http.mapper";
import { hltbErrorDomainNormalizer } from "../../src/hltb/errors/hltb.error-domain.normalizer";
import * as hltbServiceError from "../../src/hltb/errors/hltb.service-error";
import { hltbServiceToDomainMapper } from "../../src/hltb/errors/hltb.service-to-domain.mapper";
import { ScrapingRequestError } from "../../src/scraping/errors/scraping-request.error";
import { type ScrapingFailureKind } from "../../src/scraping/scraping.types";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";
import { fakeRequest } from "../unit-helpers/http-fakes";

const SERVICE = "HLTB Provider";

describeModuleErrors({
	name: "Hltb",
	service: SERVICE,
	mapper: hltbServiceToDomainMapper,
	normalizer: hltbErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "HLTB_NOT_FOUND",
			module: SERVICE,
			code: "HLTB_NOT_FOUND",
			message: "Game not found in HowLongToBeat"
		},
		{
			serviceCode: "HLTB_PARSE_ERROR",
			module: SERVICE,
			code: "HLTB_PARSE_ERROR",
			message: "Unexpected HowLongToBeat page structure"
		},
		{
			serviceCode: "HLTB_RATE_LIMITED",
			module: SERVICE,
			code: "HLTB_RATE_LIMITED",
			message: "HowLongToBeat rate limit reached"
		},
		{
			serviceCode: "HLTB_BLOCKED",
			module: SERVICE,
			code: "HLTB_BLOCKED",
			message: "HowLongToBeat blocked the request"
		},
		{
			serviceCode: "HLTB_TIMEOUT",
			module: SERVICE,
			code: "HLTB_TIMEOUT",
			message: "HowLongToBeat request timed out"
		},
		{
			serviceCode: "HLTB_ABORTED",
			module: SERVICE,
			code: "HLTB_ABORTED",
			message: "HowLongToBeat request was aborted"
		},
		{
			serviceCode: "HLTB_REQUEST_ERROR",
			module: SERVICE,
			code: "HLTB_REQUEST_ERROR",
			message: "HowLongToBeat request failed"
		}
	],
	fallback: {
		module: SERVICE,
		code: "HLTB_INTERNAL_ERROR",
		message: "Unexpected HLTB Provider error"
	}
});

const HTTP_STATUSES = [
	{ code: "HLTB_NOT_FOUND", status: 404 },
	{ code: "HLTB_RATE_LIMITED", status: 429 },
	{ code: "HLTB_REQUEST_ERROR", status: 502 },
	{ code: "HLTB_PARSE_ERROR", status: 502 },
	{ code: "HLTB_BLOCKED", status: 502 },
	{ code: "HLTB_TIMEOUT", status: 504 },
	{ code: "HLTB_ABORTED", status: 504 }
];

describeDomainToHttpMapper({
	name: "Hltb",
	mapper: hltbDomainToHttpMapper,
	cases: HTTP_STATUSES
});

void describe("Hltb errors through the global normalizers", () => {
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

void describe("hltbServiceError.fromRequestFailure", () => {
	const kinds: ScrapingFailureKind[] = [
		"NOT_FOUND",
		"RATE_LIMITED",
		"BLOCKED",
		"TIMEOUT",
		"REQUEST_ERROR",
		"ABORTED"
	];

	for (const kind of kinds) {
		void it(`maps a ${kind} request failure to HLTB_${kind}`, () => {
			const error = hltbServiceError.fromRequestFailure(
				new ScrapingRequestError(kind, {
					url: "https://x",
					attempts: 1
				})
			);

			assert.equal(error.code, `HLTB_${kind}`);
			assert.equal(error.serviceError.service, SERVICE);
			assert.deepEqual(error.serviceError.raw, {
				kind,
				url: "https://x",
				attempts: 1
			});
		});
	}

	void it("maps an unexpected error to HLTB_REQUEST_ERROR", () => {
		const raw = new Error("boom");
		const error = hltbServiceError.fromRequestFailure(raw);

		assert.equal(error.code, "HLTB_REQUEST_ERROR");
		assert.equal(error.serviceError.raw, raw);
	});
});
