/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ForeignKeyConstraintError } from "sequelize";

import { DomainError } from "../../../src/common/errors/domain-error";
import { globalErrorDomainNormalizer } from "../../../src/common/errors/global-error-domain.normalizer";
import { ServiceError } from "../../../src/common/errors/service-error";

function serviceError(service: string, code: string) {
	return new ServiceError(code, { service, raw: undefined });
}

describe("globalErrorDomainNormalizer", () => {
	it("returns a DomainError as is", () => {
		const domainError = new DomainError(
			"Game Module",
			"GAME_NOT_FOUND",
			"x"
		);

		assert.equal(
			globalErrorDomainNormalizer(domainError, "c"),
			domainError
		);
	});

	const routedServices: [string, string, string, string][] = [
		["Users Service", "USER_NOT_FOUND", "User Module", "USER_NOT_FOUND"],
		["Games Service", "GAME_NOT_FOUND", "Game Module", "GAME_NOT_FOUND"],
		[
			"Backlog Service",
			"BACKLOG_FORBIDDEN",
			"Backlog Module",
			"BACKLOG_FORBIDDEN"
		],
		[
			"GameShelf Service",
			"GAME_SHELF_LIMIT_REACHED",
			"GameShelf Module",
			"GAME_SHELF_LIMIT_REACHED"
		],
		["List Service", "LIST_FROZEN", "List Module", "LIST_FROZEN"],
		[
			"MoodTags Service",
			"MOOD_TAGS_LIMIT_REACHED",
			"MoodTags Module",
			"MOOD_TAGS_LIMIT_REACHED"
		],
		[
			"Franchise Service",
			"FRANCHISE_NOT_FOUND",
			"Franchise Module",
			"FRANCHISE_NOT_FOUND"
		]
	];

	for (const [
		service,
		code,
		expectedModule,
		expectedCode
	] of routedServices) {
		it(`routes a ${service} ServiceError to ${expectedModule}`, () => {
			const domainError = globalErrorDomainNormalizer(
				serviceError(service, code),
				"corr"
			);

			assert.equal(domainError.module, expectedModule);
			assert.equal(domainError.code, expectedCode);
			assert.equal(domainError.context?.correlationId, "corr");
		});
	}

	it("maps a ServiceError from an unknown service to INTERNAL_ERROR", () => {
		const domainError = globalErrorDomainNormalizer(
			serviceError("Ghost Service", "X"),
			"corr"
		);

		assert.equal(domainError.module, "COMMON");
		assert.equal(domainError.code, "INTERNAL_ERROR");
	});

	it("maps a foreign key error on parent delete to COMMON_RESOURCE_IN_USE", () => {
		const raw = new ForeignKeyConstraintError({
			message:
				'update or delete on table "Games" violates foreign key constraint'
		});

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.module, "Common Module");
		assert.equal(domainError.code, "COMMON_RESOURCE_IN_USE");
	});

	it("maps a foreign key error on child insert to COMMON_REFERENCE_NOT_FOUND", () => {
		const raw = new ForeignKeyConstraintError({
			message:
				'insert or update on table "Backlogs" violates foreign key constraint'
		});

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.code, "COMMON_REFERENCE_NOT_FOUND");
	});

	it("wraps unexpected errors as INTERNAL_ERROR keeping the raw error", () => {
		const raw = new Error("boom");

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.code, "INTERNAL_ERROR");
		assert.equal(domainError.context?.raw, raw);
		assert.equal(domainError.context?.correlationId, "corr");
	});
});
