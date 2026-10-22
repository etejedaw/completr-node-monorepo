import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Request } from "express";

import { DomainError } from "../../src/common/errors/domain-error";
import { HttpError } from "../../src/common/errors/http-error";
import { ServiceError } from "../../src/common/errors/service-error";
import { fakeRequest } from "./http-fakes";

export interface ServiceToDomainCase {
	serviceCode: string;
	module: string;
	code: string;
	message: string;
}

type ServiceToDomainMapper = (
	error: unknown,
	correlationId: string
) => DomainError;

interface ModuleErrorsSpec {
	name: string;
	service: string;
	mapper: ServiceToDomainMapper;
	normalizer: ServiceToDomainMapper;
	cases: ServiceToDomainCase[];
	fallback: Omit<ServiceToDomainCase, "serviceCode">;
}

const CORRELATION_ID = "corr-123";

function serviceErrorOf(service: string, code: string, raw?: unknown) {
	return new ServiceError(code, { service, raw });
}

export function assertCommonInternalError(
	error: DomainError,
	raw: unknown,
	correlationId = CORRELATION_ID
) {
	assert.ok(error instanceof DomainError);
	assert.equal(error.module, "COMMON");
	assert.equal(error.code, "INTERNAL_ERROR");
	assert.equal(error.context?.raw, raw);
	assert.equal(error.context?.correlationId, correlationId);
}

export function describeModuleErrors(spec: ModuleErrorsSpec) {
	const { name, service, mapper, normalizer, cases, fallback } = spec;
	const [firstCase] = cases;
	assert.ok(firstCase, `${name} needs at least one case`);

	void describe(`${name} service-to-domain mapper`, () => {
		for (const expected of cases) {
			void it(`maps ${expected.serviceCode} to ${expected.code}`, () => {
				const raw = { cause: expected.serviceCode };
				const domainError = mapper(
					serviceErrorOf(service, expected.serviceCode, raw),
					CORRELATION_ID
				);

				assert.ok(domainError instanceof DomainError);
				assert.equal(domainError.module, expected.module);
				assert.equal(domainError.code, expected.code);
				assert.equal(domainError.message, expected.message);
				assert.equal(
					domainError.context?.correlationId,
					CORRELATION_ID
				);
				assert.equal(domainError.context?.service, service);
				assert.equal(domainError.context?.raw, raw);
			});
		}

		void it(`maps an unknown code to ${fallback.code}`, () => {
			const domainError = mapper(
				serviceErrorOf(service, "SOMETHING_UNEXPECTED"),
				CORRELATION_ID
			);

			assert.equal(domainError.module, fallback.module);
			assert.equal(domainError.code, fallback.code);
			assert.equal(domainError.message, fallback.message);
			assert.equal(domainError.context?.correlationId, CORRELATION_ID);
			assert.equal(domainError.context?.service, service);
		});

		void it("rethrows an error that is not a ServiceError", () => {
			const unexpected = new Error("boom");

			assert.throws(() => mapper(unexpected, CORRELATION_ID), unexpected);
		});
	});

	void describe(`${name} error-domain normalizer`, () => {
		void it("returns a DomainError as is", () => {
			const domainError = new DomainError(
				"Some Module",
				"SOME_CODE",
				"message"
			);

			assert.equal(normalizer(domainError, CORRELATION_ID), domainError);
		});

		void it("delegates a ServiceError to the service-to-domain mapper", () => {
			const serviceError = serviceErrorOf(service, firstCase.serviceCode);

			const domainError = normalizer(serviceError, CORRELATION_ID);

			assert.equal(domainError.module, firstCase.module);
			assert.equal(domainError.code, firstCase.code);
			assert.equal(domainError.context?.correlationId, CORRELATION_ID);
		});

		void it("falls back to the module internal error for an unknown ServiceError", () => {
			const domainError = normalizer(
				serviceErrorOf(service, "SOMETHING_UNEXPECTED"),
				CORRELATION_ID
			);

			assert.equal(domainError.module, fallback.module);
			assert.equal(domainError.code, fallback.code);
		});

		void it("maps any other error to COMMON INTERNAL_ERROR", () => {
			const unexpected = new Error("boom");

			assertCommonInternalError(
				normalizer(unexpected, CORRELATION_ID),
				unexpected
			);
		});

		void it("maps a non-Error value to COMMON INTERNAL_ERROR", () => {
			assertCommonInternalError(
				normalizer("plain string", CORRELATION_ID),
				"plain string"
			);
		});
	});
}

export interface DomainToHttpCase {
	code: string;
	status: number;
	detail?: string;
}

interface DomainToHttpSpec {
	name: string;
	mapper: (error: DomainError, request: Request) => HttpError;
	cases: DomainToHttpCase[];
}

export function describeDomainToHttpMapper(spec: DomainToHttpSpec) {
	const { name, mapper, cases } = spec;

	void describe(`${name} domain-to-http mapper`, () => {
		for (const expected of cases) {
			void it(`maps ${expected.code} to HTTP ${expected.status}`, () => {
				const context = { correlationId: "corr-1", extra: "value" };
				const domainError = new DomainError(
					"Some Module",
					expected.code,
					"readable message",
					context
				);

				const httpError = mapper(
					domainError,
					fakeRequest({
						originalUrl: "/some/path",
						correlationId: "corr-1"
					})
				);

				assert.ok(httpError instanceof HttpError);
				assert.equal(httpError.status, expected.status);
				assert.equal(httpError.type, expected.code);
				assert.equal(httpError.title, "readable message");
				assert.equal(httpError.instance, "/some/path");
				assert.equal(httpError.correlationId, "corr-1");
				assert.equal(httpError.context, context);
				assert.equal(httpError.detail, expected.detail);
			});
		}

		void it("maps an unknown code to HTTP 500", () => {
			const httpError = mapper(
				new DomainError(
					"Some Module",
					"SOMETHING_UNEXPECTED",
					"message"
				),
				fakeRequest()
			);

			assert.equal(httpError.status, 500);
			assert.equal(httpError.type, "SOMETHING_UNEXPECTED");
			assert.equal(httpError.detail, undefined);
		});
	});
}
