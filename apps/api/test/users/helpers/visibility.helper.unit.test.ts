/// <reference types="node" />

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import * as userFollowersService from "../../../src/user-followers/user-followers.service";
import { type VisibilityLevel } from "../../../src/users/constants/visibility.constants";
import {
	canView,
	resolveSectionAccess
} from "../../../src/users/helpers/visibility.helper";
import { type User } from "../../../src/users/user.model";
import { asModel } from "../../unit-helpers/as-model";

function buildOwner(levels: Partial<Record<string, VisibilityLevel>> = {}) {
	return asModel<User>({
		id: "owner",
		profileVisibility: "private",
		queueVisibility: "private",
		wishlistVisibility: "private",
		favoriteVisibility: "private",
		feedVisibility: "private",
		backlogVisibility: "private",
		shelfVisibility: "private",
		listVisibility: "private",
		...levels
	});
}

function mockMutualFollowers(result: boolean) {
	return mock.method(
		userFollowersService,
		"areMutualFollowers",
		async () => result
	);
}

describe("canView", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("always allows the owner even when the section is private", async () => {
		const mutual = mockMutualFollowers(false);

		assert.equal(await canView("owner", buildOwner(), "backlog"), true);
		assert.equal(mutual.mock.callCount(), 0);
	});

	it("allows public sections to anonymous viewers", async () => {
		assert.equal(
			await canView(
				undefined,
				buildOwner({ backlogVisibility: "public" }),
				"backlog"
			),
			true
		);
	});

	it("denies private sections to everyone else", async () => {
		mockMutualFollowers(true);

		assert.equal(await canView("viewer", buildOwner(), "backlog"), false);
		assert.equal(await canView(undefined, buildOwner(), "backlog"), false);
	});

	it("denies friends sections to anonymous viewers", async () => {
		const mutual = mockMutualFollowers(true);

		assert.equal(
			await canView(
				undefined,
				buildOwner({ queueVisibility: "friends" }),
				"queue"
			),
			false
		);
		assert.equal(mutual.mock.callCount(), 0);
	});

	it("allows friends sections only to mutual followers", async () => {
		const owner = buildOwner({ wishlistVisibility: "friends" });

		mockMutualFollowers(true);
		assert.equal(await canView("viewer", owner, "wishlist"), true);

		mock.restoreAll();
		mockMutualFollowers(false);
		assert.equal(await canView("viewer", owner, "wishlist"), false);
	});

	it("checks the mutual follow between the viewer and the owner", async () => {
		const mutual = mockMutualFollowers(true);

		await canView(
			"viewer",
			buildOwner({ shelfVisibility: "friends" }),
			"shelf"
		);

		assert.deepEqual(mutual.mock.calls[0]?.arguments, ["viewer", "owner"]);
	});

	it("resolves each section against its own visibility field", async () => {
		const owner = buildOwner({ profileVisibility: "public" });

		assert.equal(await canView("viewer", owner, "profile"), true);
		assert.equal(await canView("viewer", owner, "list"), false);
	});
});

describe("resolveSectionAccess", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	it("grants every section to the owner without checking followers", async () => {
		const mutual = mockMutualFollowers(false);

		const access = await resolveSectionAccess("owner", buildOwner());

		assert.equal(Object.values(access).every(Boolean), true);
		assert.equal(mutual.mock.callCount(), 0);
	});

	it("grants public sections and denies private ones to a stranger", async () => {
		const access = await resolveSectionAccess(
			"viewer",
			buildOwner({
				profileVisibility: "public",
				feedVisibility: "public"
			})
		);

		assert.equal(access.profile, true);
		assert.equal(access.feed, true);
		assert.equal(access.backlog, false);
	});

	it("grants friends sections to mutual followers with a single follower lookup", async () => {
		const mutual = mockMutualFollowers(true);

		const access = await resolveSectionAccess(
			"viewer",
			buildOwner({
				queueVisibility: "friends",
				shelfVisibility: "friends"
			})
		);

		assert.equal(access.queue, true);
		assert.equal(access.shelf, true);
		assert.equal(access.backlog, false);
		assert.equal(mutual.mock.callCount(), 1);
	});

	it("denies friends sections to non mutual followers", async () => {
		mockMutualFollowers(false);

		const access = await resolveSectionAccess(
			"viewer",
			buildOwner({ queueVisibility: "friends" })
		);

		assert.equal(access.queue, false);
	});

	it("skips the follower lookup when no section is friends only or the viewer is anonymous", async () => {
		const mutual = mockMutualFollowers(true);

		await resolveSectionAccess(
			"viewer",
			buildOwner({ profileVisibility: "public" })
		);
		const anonymous = await resolveSectionAccess(
			undefined,
			buildOwner({ queueVisibility: "friends" })
		);

		assert.equal(mutual.mock.callCount(), 0);
		assert.equal(anonymous.queue, false);
	});
});
