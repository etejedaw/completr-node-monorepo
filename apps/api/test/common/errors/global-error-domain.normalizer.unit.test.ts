import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ForeignKeyConstraintError } from "sequelize";

import { DomainError } from "../../../src/common/errors/domain-error";
import { globalErrorDomainNormalizer } from "../../../src/common/errors/global-error-domain.normalizer";
import { ServiceError } from "../../../src/common/errors/service-error";

function serviceError(service: string, code: string) {
	return new ServiceError(code, { service, raw: undefined });
}

void describe("globalErrorDomainNormalizer", () => {
	void it("returns a DomainError as is", () => {
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
			"Platform Service",
			"PLATFORM_NOT_FOUND",
			"Platform Module",
			"PLATFORM_NOT_FOUND"
		],
		["Genre Service", "GENRE_NOT_FOUND", "Genre Module", "GENRE_NOT_FOUND"],
		[
			"Franchise Service",
			"FRANCHISE_NOT_FOUND",
			"Franchise Module",
			"FRANCHISE_NOT_FOUND"
		],
		[
			"GameShelf Service",
			"GAME_SHELF_LIMIT_REACHED",
			"GameShelf Module",
			"GAME_SHELF_LIMIT_REACHED"
		],
		[
			"ScoreSource Service",
			"SCORE_SOURCE_UNIQUE_CONSTRAINT",
			"ScoreSource Module",
			"SCORE_SOURCE_ALREADY_EXISTS"
		],
		[
			"GameScore Service",
			"GAME_SCORE_NOT_FOUND",
			"GameScore Module",
			"GAME_SCORE_NOT_FOUND"
		],
		[
			"GameTime Service",
			"GAME_TIME_NOT_FOUND",
			"GameTime Module",
			"GAME_TIME_NOT_FOUND"
		],
		[
			"Backlog Service",
			"BACKLOG_FORBIDDEN",
			"Backlog Module",
			"BACKLOG_FORBIDDEN"
		],
		[
			"SavedFilter Service",
			"SAVED_FILTER_LIMIT_REACHED",
			"SavedFilter Module",
			"SAVED_FILTER_LIMIT_REACHED"
		],
		["List Service", "LIST_FROZEN", "List Module", "LIST_FROZEN"],
		[
			"ListItem Service",
			"LIST_ITEM_FROZEN",
			"ListItem Module",
			"LIST_ITEM_FROZEN"
		],
		[
			"ListFollower Service",
			"LIST_FOLLOWER_LIST_NOT_FOUND",
			"ListFollower Module",
			"LIST_FOLLOWER_LIST_NOT_FOUND"
		],
		[
			"Queue Service",
			"QUEUE_LIMIT_REACHED",
			"Queue Module",
			"QUEUE_LIMIT_REACHED"
		],
		[
			"Wishlist Service",
			"WISHLIST_LIMIT_REACHED",
			"Wishlist Module",
			"WISHLIST_LIMIT_REACHED"
		],
		[
			"Favorite Service",
			"FAVORITE_LIMIT_REACHED",
			"Favorite Module",
			"FAVORITE_LIMIT_REACHED"
		],
		[
			"GameReport Service",
			"GAME_REPORT_NOT_FOUND",
			"GameReport Module",
			"GAME_REPORT_NOT_FOUND"
		],
		[
			"UserFollower Service",
			"USER_FOLLOWER_USER_NOT_FOUND",
			"UserFollower Module",
			"USER_FOLLOWER_USER_NOT_FOUND"
		],
		[
			"UserFollowRequest Service",
			"USER_FOLLOW_REQUEST_NOT_FOUND",
			"UserFollowRequest Module",
			"USER_FOLLOW_REQUEST_NOT_FOUND"
		],
		[
			"Review Service",
			"REVIEW_NOT_FOUND",
			"Review Module",
			"REVIEW_NOT_FOUND"
		],
		[
			"MoodTags Service",
			"MOOD_TAGS_LIMIT_REACHED",
			"MoodTags Module",
			"MOOD_TAGS_LIMIT_REACHED"
		],
		[
			"BacklogProgress Service",
			"BACKLOG_PROGRESS_BACKLOG_NOT_FOUND",
			"BacklogProgress Module",
			"BACKLOG_PROGRESS_BACKLOG_NOT_FOUND"
		],
		[
			"CoopRuns Service",
			"COOP_BACKLOG_NOT_FOUND",
			"CoopRuns Module",
			"COOP_BACKLOG_NOT_FOUND"
		],
		[
			"RAWG Provider",
			"RAWG_RATE_LIMITED",
			"RAWG Provider",
			"RAWG_RATE_LIMITED"
		],
		[
			"Invitation Service",
			"INVITATION_UNIQUE_CONSTRAINT",
			"Invitation Module",
			"INVITATION_UNIQUE_CONSTRAINT"
		],
		["Mail Provider", "MAIL_DISABLED", "Mail Provider", "MAIL_DISABLED"],
		[
			"Game External Service",
			"GAME_EXTERNAL_UNIQUE_CONSTRAINT",
			"Game External Module",
			"GAME_EXTERNAL_ALREADY_EXISTS"
		]
	];

	for (const [
		service,
		code,
		expectedModule,
		expectedCode
	] of routedServices) {
		void it(`routes a ${service} ServiceError to ${expectedModule}`, () => {
			const domainError = globalErrorDomainNormalizer(
				serviceError(service, code),
				"corr"
			);

			assert.equal(domainError.module, expectedModule);
			assert.equal(domainError.code, expectedCode);
			assert.equal(domainError.context?.correlationId, "corr");
		});
	}

	void it("maps an Auth Service ServiceError to COMMON INTERNAL_ERROR through the auth normalizer", () => {
		const raw = serviceError("Auth Service", "AUTH_ANYTHING");

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.module, "COMMON");
		assert.equal(domainError.code, "INTERNAL_ERROR");
		assert.equal(domainError.message, "Unexpected internal error");
		assert.equal(domainError.context?.raw, raw);
		assert.equal(domainError.context?.correlationId, "corr");
	});

	void it("maps a ServiceError from an unknown service to INTERNAL_ERROR", () => {
		const domainError = globalErrorDomainNormalizer(
			serviceError("Ghost Service", "X"),
			"corr"
		);

		assert.equal(domainError.module, "COMMON");
		assert.equal(domainError.code, "INTERNAL_ERROR");
		assert.equal(domainError.message, "Unexpected internal error");
	});

	void it("maps a foreign key error on parent delete to COMMON_RESOURCE_IN_USE", () => {
		const raw = new ForeignKeyConstraintError({
			message:
				'update or delete on table "Games" violates foreign key constraint'
		});

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.module, "Common Module");
		assert.equal(domainError.code, "COMMON_RESOURCE_IN_USE");
	});

	void it("maps a foreign key error on child insert to COMMON_REFERENCE_NOT_FOUND", () => {
		const raw = new ForeignKeyConstraintError({
			message:
				'insert or update on table "Backlogs" violates foreign key constraint'
		});

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.code, "COMMON_REFERENCE_NOT_FOUND");
	});

	void it("wraps unexpected errors as INTERNAL_ERROR keeping the raw error", () => {
		const raw = new Error("boom");

		const domainError = globalErrorDomainNormalizer(raw, "corr");

		assert.equal(domainError.code, "INTERNAL_ERROR");
		assert.equal(domainError.context?.raw, raw);
		assert.equal(domainError.context?.correlationId, "corr");
	});
});
