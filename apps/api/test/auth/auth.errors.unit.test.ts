import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authDomainToHttpMapper } from "../../src/auth/errors/auth.domain-to-http.mapper";
import { authErrorDomainNormalizer } from "../../src/auth/errors/auth.error-domain.normalizer";
import { DomainError } from "../../src/common/errors/domain-error";
import { ServiceError } from "../../src/common/errors/service-error";
import {
	assertCommonInternalError,
	describeDomainToHttpMapper
} from "../unit-helpers/error-layers";

void describe("authErrorDomainNormalizer", () => {
	void it("returns a DomainError as is", () => {
		const domainError = new DomainError(
			"Auth Module",
			"AUTH_INVALID_CREDENTIALS",
			"message"
		);

		assert.equal(
			authErrorDomainNormalizer(domainError, "corr"),
			domainError
		);
	});

	void it("maps a ServiceError to COMMON INTERNAL_ERROR", () => {
		const serviceError = new ServiceError("AUTH_ANYTHING", {
			service: "Auth Service",
			raw: undefined
		});

		assertCommonInternalError(
			authErrorDomainNormalizer(serviceError, "corr"),
			serviceError,
			"corr"
		);
	});

	void it("maps any other error to COMMON INTERNAL_ERROR", () => {
		const unexpected = new Error("boom");

		assertCommonInternalError(
			authErrorDomainNormalizer(unexpected, "corr"),
			unexpected,
			"corr"
		);
	});
});

describeDomainToHttpMapper({
	name: "Auth",
	mapper: authDomainToHttpMapper,
	cases: [
		{
			code: "AUTH_USER_ALREADY_EXISTS",
			status: 409,
			detail: "The email or username are already registered. Use a different"
		},
		{
			code: "AUTH_INVALID_CREDENTIALS",
			status: 401,
			detail: "Invalid email or password"
		},
		{
			code: "AUTH_INVALID_TOKEN",
			status: 401,
			detail: "The access token is invalid or expired"
		},
		{
			code: "AUTH_SCHEMA_INVALID",
			status: 422,
			detail: "The provided authentication data does not match the required format"
		},
		{
			code: "AUTH_RATE_LIMITED",
			status: 429,
			detail: "Too many authentication attempts. Please try again later."
		},
		{
			code: "AUTH_FORBIDDEN",
			status: 403,
			detail: "Your role does not grant permission"
		},
		{
			code: "AUTH_INVALID_REFRESH_TOKEN",
			status: 401,
			detail: "The refresh token is invalid, expired or has already been used"
		},
		{
			code: "AUTH_INVALID_PASSWORD_RESET_TOKEN",
			status: 400,
			detail: "The password reset link is invalid, expired or has already been used"
		},
		{
			code: "AUTH_ROUTE_NOT_FOUND",
			status: 404,
			detail: "The requested resource was not found"
		}
	]
});
