import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { globalErrorDomainNormalizer } from "../../src/common/errors/global-error-domain.normalizer";
import { globalErrorHttpNormalizer } from "../../src/common/errors/global-error-http.normalizer";
import { ServiceError } from "../../src/common/errors/service-error";
import { igdbDomainToHttpMapper } from "../../src/igdb/errors/igdb.domain-to-http.mapper";
import { igdbErrorDomainNormalizer } from "../../src/igdb/errors/igdb.error-domain.normalizer";
import { igdbServiceToDomainMapper } from "../../src/igdb/errors/igdb.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";
import { fakeRequest } from "../unit-helpers/http-fakes";

const SERVICE = "IGDB Provider";

const HTTP_STATUSES = [
	{ code: "IGDB_DISABLED", status: 503 },
	{ code: "IGDB_NOT_FOUND", status: 404 },
	{ code: "IGDB_RATE_LIMITED", status: 429 },
	{ code: "IGDB_AUTH_ERROR", status: 502 },
	{ code: "IGDB_REQUEST_ERROR", status: 502 },
	{ code: "IGDB_PARSE_ERROR", status: 502 },
	{ code: "IGDB_INTERNAL_ERROR", status: 500 }
];

describeModuleErrors({
	name: "Igdb",
	service: SERVICE,
	mapper: igdbServiceToDomainMapper,
	normalizer: igdbErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "IGDB_DISABLED",
			module: SERVICE,
			code: "IGDB_DISABLED",
			message: "IGDB integration is disabled"
		},
		{
			serviceCode: "IGDB_NOT_FOUND",
			module: SERVICE,
			code: "IGDB_NOT_FOUND",
			message: "Game not found in IGDB"
		},
		{
			serviceCode: "IGDB_RATE_LIMITED",
			module: SERVICE,
			code: "IGDB_RATE_LIMITED",
			message: "IGDB rate limit reached"
		},
		{
			serviceCode: "IGDB_AUTH_ERROR",
			module: SERVICE,
			code: "IGDB_AUTH_ERROR",
			message: "IGDB rejected the credentials"
		},
		{
			serviceCode: "IGDB_REQUEST_ERROR",
			module: SERVICE,
			code: "IGDB_REQUEST_ERROR",
			message: "IGDB request failed"
		},
		{
			serviceCode: "IGDB_PARSE_ERROR",
			module: SERVICE,
			code: "IGDB_PARSE_ERROR",
			message: "Unexpected IGDB response"
		}
	],
	fallback: {
		module: SERVICE,
		code: "IGDB_INTERNAL_ERROR",
		message: "Unexpected IGDB Provider error"
	}
});

describeDomainToHttpMapper({
	name: "Igdb",
	mapper: igdbDomainToHttpMapper,
	cases: HTTP_STATUSES
});

void describe("Igdb errors through the global normalizers", () => {
	for (const { code, status } of HTTP_STATUSES) {
		void it(`${code} reaches the client as HTTP ${status}`, () => {
			const domainError = globalErrorDomainNormalizer(
				new ServiceError(code, { service: SERVICE, raw: undefined }),
				"corr-1"
			);
			const httpError = globalErrorHttpNormalizer(
				domainError,
				fakeRequest({ originalUrl: "/x", correlationId: "corr-1" })
			);

			assert.equal(domainError.module, SERVICE);
			assert.equal(httpError.type, code);
			assert.equal(httpError.status, status);
		});
	}

	void it("an unknown IGDB code falls back to IGDB_INTERNAL_ERROR, not the common error", () => {
		const domainError = globalErrorDomainNormalizer(
			new ServiceError("IGDB_SOMETHING_ODD", {
				service: SERVICE,
				raw: undefined
			}),
			"corr-1"
		);

		assert.equal(domainError.module, SERVICE);
		assert.equal(domainError.code, "IGDB_INTERNAL_ERROR");
	});
});
