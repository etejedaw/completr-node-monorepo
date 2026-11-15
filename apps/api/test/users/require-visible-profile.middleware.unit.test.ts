import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { type NextFunction, type Request, type Response } from "express";

import { ServiceError } from "../../src/common/errors/service-error";
import { requireVisibleProfileMiddleware } from "../../src/users/require-visible-profile.middleware";
import * as usersService from "../../src/users/services/users.service";
import { asModel } from "../unit-helpers/as-model";
import { captureRejection, stub } from "../unit-helpers/mocks";

const OWNER_ID = "owner-1";

function ownerWith(visibility: Record<string, string> = {}) {
	return asModel({
		id: OWNER_ID,
		username: "owner",
		profileVisibility: "public",
		backlogVisibility: "public",
		queueVisibility: "public",
		wishlistVisibility: "public",
		favoriteVisibility: "public",
		shelfVisibility: "public",
		platinumVisibility: "public",
		...visibility
	});
}

function requestFor(viewerId?: string) {
	return asModel<Request>({
		locals: {
			params: { username: "owner" },
			...(viewerId ? { user: { id: viewerId } } : {})
		}
	});
}

async function runGate(
	section: Parameters<typeof requireVisibleProfileMiddleware>[0],
	request: Request
) {
	const next = mock.fn<NextFunction>();
	const outcome = await captureRejection(
		requireVisibleProfileMiddleware(section)(
			request,
			asModel<Response>({}),
			next
		)
	);
	return { next, outcome };
}

function serviceCode(error: unknown) {
	assert.ok(error instanceof ServiceError);
	return error.code;
}

void describe("requireVisibleProfileMiddleware", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	void it("rejects an unknown or inactive username as USER_NOT_FOUND", async () => {
		stub(usersService, "findUserByUsername", async () => null);

		const { next, outcome } = await runGate("backlog", requestFor());

		assert.equal(serviceCode(outcome), "USER_NOT_FOUND");
		assert.equal(next.mock.callCount(), 0);
	});

	void it("rejects a private profile as USER_PRIVATE even when the section is public", async () => {
		stub(usersService, "findUserByUsername", async () =>
			ownerWith({ profileVisibility: "private" })
		);

		const { next, outcome } = await runGate("queue", requestFor("guest"));

		assert.equal(serviceCode(outcome), "USER_PRIVATE");
		assert.equal(next.mock.callCount(), 0);
	});

	void it("rejects a private section of a public profile as USER_PRIVATE", async () => {
		stub(usersService, "findUserByUsername", async () =>
			ownerWith({ wishlistVisibility: "private" })
		);

		const { next, outcome } = await runGate("wishlist", requestFor());

		assert.equal(serviceCode(outcome), "USER_PRIVATE");
		assert.equal(next.mock.callCount(), 0);
	});

	void it("leaves the owner in request.locals and continues when both are visible", async () => {
		const owner = ownerWith();
		stub(usersService, "findUserByUsername", async () => owner);
		const request = requestFor();

		const { next, outcome } = await runGate("favorite", request);

		assert.equal(outcome, undefined);
		assert.equal(next.mock.callCount(), 1);
		assert.equal(request.locals.profileOwner, owner);
		assert.deepEqual(request.locals.params, { username: "owner" });
	});

	void it("lets the owner through their own private profile and section", async () => {
		const owner = ownerWith({
			profileVisibility: "private",
			platinumVisibility: "private"
		});
		stub(usersService, "findUserByUsername", async () => owner);
		const request = requestFor(OWNER_ID);

		const { next } = await runGate("platinum", request);

		assert.equal(next.mock.callCount(), 1);
		assert.equal(request.locals.profileOwner, owner);
	});
});
