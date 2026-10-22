import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { ListFollower } from "../../src/list-followers/list-follower.model";
import { type List } from "../../src/lists/list.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import {
	VISIBILITY_LEVELS,
	type VisibilityLevel
} from "../../src/users/constants/visibility.constants";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createList, createScoreSource } from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	scoreSource = (await createScoreSource()).code;
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

type ViewerKey = "anonymous" | "stranger" | "oneWay" | "mutual" | "self";

interface OwnerCase {
	profile: VisibilityLevel;
	section: VisibilityLevel;
	owner: Account;
	publicList: List;
	privateList: List;
}

interface Fixture {
	viewers: Record<"stranger" | "oneWay" | "mutual", Account>;
	owners: OwnerCase[];
	officialOwners: OwnerCase[];
}

const ALL_VIEWERS: ViewerKey[] = [
	"anonymous",
	"stranger",
	"oneWay",
	"mutual",
	"self"
];

const AUTHENTICATED_VIEWERS = ALL_VIEWERS.filter(key => key !== "anonymous");

const LEVEL_PAIRS = VISIBILITY_LEVELS.flatMap(profile =>
	VISIBILITY_LEVELS.map(section => ({ profile, section }))
);

const SEARCH_TERM = "Visibility";

let fixture: Fixture;

function follow(follower: Account, target: Account) {
	return UserFollower.create({
		followerId: follower.user.id,
		followingId: target.user.id
	});
}

async function createOwnerCase(
	profile: VisibilityLevel,
	section: VisibilityLevel,
	viewers: Fixture["viewers"],
	role: "user" | "admin" = "user"
): Promise<OwnerCase> {
	const owner = await createUserWithSession(role);
	await owner.user.update({
		profileVisibility: profile,
		listVisibility: section
	});
	await follow(viewers.oneWay, owner);
	await follow(viewers.mutual, owner);
	await follow(owner, viewers.mutual);

	const label = `${SEARCH_TERM} ${role} ${profile}-${section}`;
	const publicList = await createList(owner.user.id, scoreSource, {
		name: `${label} public`,
		isPublic: true
	});
	const privateList = await createList(owner.user.id, scoreSource, {
		name: `${label} private`,
		isPublic: false
	});
	return { profile, section, owner, publicList, privateList };
}

async function buildFixture(): Promise<Fixture> {
	const [stranger, oneWay, mutual] = await Promise.all(
		Array.from({ length: 3 }, () => createUserWithSession())
	);
	const viewers = {
		stranger: stranger!,
		oneWay: oneWay!,
		mutual: mutual!
	};

	const owners: OwnerCase[] = [];
	for (const { profile, section } of LEVEL_PAIRS)
		owners.push(await createOwnerCase(profile, section, viewers));

	const officialOwners: OwnerCase[] = [];
	for (const { profile, section } of [
		{ profile: "public", section: "public" },
		{ profile: "friends", section: "public" },
		{ profile: "public", section: "friends" },
		{ profile: "private", section: "public" },
		{ profile: "public", section: "private" }
	] as const)
		officialOwners.push(
			await createOwnerCase(profile, section, viewers, "admin")
		);

	return { viewers, owners, officialOwners };
}

before(async () => {
	fixture = await buildFixture();
});

function ownerCaseOf(profile: VisibilityLevel, section: VisibilityLevel) {
	return fixture.owners.find(
		ownerCase =>
			ownerCase.profile === profile && ownerCase.section === section
	)!;
}

function authorizationOf(viewerKey: ViewerKey, ownerCase: OwnerCase) {
	if (viewerKey === "anonymous") return undefined;
	if (viewerKey === "self") return ownerCase.owner.authorization;
	return fixture.viewers[viewerKey].authorization;
}

function getAs(path: string, authorization?: string, query = {}) {
	const request = api().get(path).query(query);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function allows(level: VisibilityLevel, viewerKey: ViewerKey) {
	if (viewerKey === "self" || level === "public") return true;
	return level === "friends" && viewerKey === "mutual";
}

function canSeeList(
	ownerCase: OwnerCase,
	isPublic: boolean,
	viewerKey: ViewerKey
) {
	if (viewerKey === "self") return true;
	return (
		isPublic &&
		allows(ownerCase.profile, viewerKey) &&
		allows(ownerCase.section, viewerKey)
	);
}

function listIdsOf(response: { body: { data: { lists: { id: string }[] } } }) {
	return response.body.data.lists.map(list => list.id);
}

function sorted(ids: string[]) {
	return ids.toSorted();
}

function visiblePublicListIds(ownerCases: OwnerCase[], viewerKey: ViewerKey) {
	return ownerCases
		.filter(ownerCase => canSeeList(ownerCase, true, viewerKey))
		.map(ownerCase => ownerCase.publicList.id);
}

void describe("GET /users/:username/lists/:listId visibility matrix", () => {
	for (const { profile, section } of LEVEL_PAIRS) {
		void it(`applies profile ${profile} × lists ${section} × isPublic to every viewer`, async () => {
			const ownerCase = ownerCaseOf(profile, section);

			for (const viewerKey of ALL_VIEWERS) {
				for (const list of [
					ownerCase.publicList,
					ownerCase.privateList
				]) {
					const label = `${viewerKey} viewing ${list.isPublic ? "public" : "private"} list`;
					const response = await getAs(
						`/users/${ownerCase.owner.user.username}/lists/${list.id}`,
						authorizationOf(viewerKey, ownerCase)
					);

					if (!allows(profile, viewerKey)) {
						assert.equal(response.status, 403, label);
						assert.equal(response.body.type, "USER_PRIVATE", label);
					} else if (
						canSeeList(ownerCase, list.isPublic, viewerKey)
					) {
						assert.equal(response.status, 200, label);
						assert.equal(
							response.body.data.list.id,
							list.id,
							label
						);
					} else {
						assert.equal(response.status, 404, label);
						assert.equal(
							response.body.type,
							"LIST_NOT_FOUND",
							label
						);
					}
				}
			}
		});
	}

	void it("answers 404 USER_NOT_FOUND only when the user does not exist", async () => {
		const ownerCase = ownerCaseOf("public", "public");

		const response = await getAs(
			`/users/ghost_${randomUUID().slice(0, 5)}/lists/${ownerCase.publicList.id}`,
			fixture.viewers.stranger.authorization
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});

	void it("answers a hidden list and an unknown list with the same 404 LIST_NOT_FOUND", async () => {
		const ownerCase = ownerCaseOf("public", "private");
		const { authorization } = fixture.viewers.stranger;

		const hidden = await getAs(
			`/users/${ownerCase.owner.user.username}/lists/${ownerCase.publicList.id}`,
			authorization
		);
		const unknown = await getAs(
			`/users/${ownerCase.owner.user.username}/lists/${randomUUID()}`,
			authorization
		);

		assert.equal(hidden.status, 404);
		assert.equal(unknown.status, 404);
		assert.equal(hidden.body.type, "LIST_NOT_FOUND");
		assert.equal(unknown.body.type, "LIST_NOT_FOUND");
	});

	void it("does not let a follower of the list read it when the lists section is closed", async () => {
		const ownerCase = ownerCaseOf("public", "private");
		const { stranger } = fixture.viewers;
		await ListFollower.create({
			listId: ownerCase.publicList.id,
			userId: stranger.user.id
		});

		const response = await getAs(
			`/users/${ownerCase.owner.user.username}/lists/${ownerCase.publicList.id}`,
			stranger.authorization
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});
});

void describe("GET /lists/:listId visibility matrix", () => {
	void it("serves a list only when profile, lists section and isPublic allow it", async () => {
		for (const ownerCase of fixture.owners) {
			for (const viewerKey of AUTHENTICATED_VIEWERS) {
				for (const list of [
					ownerCase.publicList,
					ownerCase.privateList
				]) {
					const label = `${viewerKey} viewing ${list.isPublic ? "public" : "private"} list of profile ${ownerCase.profile} × lists ${ownerCase.section}`;
					const response = await getAs(
						`/lists/${list.id}`,
						authorizationOf(viewerKey, ownerCase)
					);

					if (canSeeList(ownerCase, list.isPublic, viewerKey)) {
						assert.equal(response.status, 200, label);
						assert.equal(
							response.body.data.list.id,
							list.id,
							label
						);
					} else {
						assert.equal(response.status, 404, label);
						assert.equal(
							response.body.type,
							"LIST_NOT_FOUND",
							label
						);
					}
				}
			}
		}
	});

	void it("requires authentication", async () => {
		const response = await getAs(
			`/lists/${ownerCaseOf("public", "public").publicList.id}`
		);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});
});

void describe("GET /users/:username/lists visibility", () => {
	const REPRESENTATIVE_PAIRS = [
		{ profile: "public", section: "public" },
		{ profile: "public", section: "friends" },
		{ profile: "friends", section: "public" },
		{ profile: "public", section: "private" },
		{ profile: "private", section: "public" }
	] as const;

	for (const { profile, section } of REPRESENTATIVE_PAIRS) {
		void it(`lists the public lists of profile ${profile} × lists ${section} only to who may see them`, async () => {
			const ownerCase = ownerCaseOf(profile, section);

			for (const viewerKey of ALL_VIEWERS) {
				const response = await getAs(
					`/users/${ownerCase.owner.user.username}/lists`,
					authorizationOf(viewerKey, ownerCase)
				);

				if (
					!allows(profile, viewerKey) ||
					!allows(section, viewerKey)
				) {
					assert.equal(response.status, 403, viewerKey);
					assert.equal(response.body.type, "USER_PRIVATE", viewerKey);
					continue;
				}
				const expected =
					viewerKey === "self"
						? [ownerCase.publicList.id, ownerCase.privateList.id]
						: [ownerCase.publicList.id];
				assert.equal(response.status, 200, viewerKey);
				assert.deepEqual(
					sorted(listIdsOf(response)),
					sorted(expected),
					viewerKey
				);
				assert.equal(response.body.data.total, expected.length);
			}
		});
	}
});

void describe("GET /lists/recent visibility", () => {
	for (const viewerKey of ["stranger", "oneWay", "mutual"] as const) {
		void it(`lists only the public lists a ${viewerKey} may see`, async () => {
			const expected = visiblePublicListIds(fixture.owners, viewerKey);

			const response = await getAs(
				"/lists/recent",
				fixture.viewers[viewerKey].authorization,
				{ limit: 50 }
			);

			assert.equal(response.status, 200);
			assert.deepEqual(sorted(listIdsOf(response)), sorted(expected));
		});
	}

	void it("applies the limit after filtering, so hidden newer lists do not shrink the page", async () => {
		const expected = visiblePublicListIds(fixture.owners, "mutual");
		assert.ok(expected.length > 1);

		const response = await getAs(
			"/lists/recent",
			fixture.viewers.mutual.authorization,
			{ limit: expected.length }
		);

		assert.deepEqual(sorted(listIdsOf(response)), sorted(expected));
	});

	void it("does not list private lists even to their owner", async () => {
		const ownerCase = ownerCaseOf("public", "public");

		const response = await getAs(
			"/lists/recent",
			ownerCase.owner.authorization,
			{ limit: 50 }
		);

		assert.ok(listIdsOf(response).includes(ownerCase.publicList.id));
		assert.ok(!listIdsOf(response).includes(ownerCase.privateList.id));
	});
});

void describe("GET /lists/official visibility", () => {
	for (const viewerKey of ["stranger", "mutual"] as const) {
		void it(`applies the same rule to the official lists a ${viewerKey} may see`, async () => {
			const expected = visiblePublicListIds(
				fixture.officialOwners,
				viewerKey
			);

			const response = await getAs(
				"/lists/official",
				fixture.viewers[viewerKey].authorization,
				{ limit: 50 }
			);

			assert.equal(response.status, 200);
			assert.deepEqual(sorted(listIdsOf(response)), sorted(expected));
			assert.ok(
				response.body.data.lists.every(
					(list: { isOfficial: boolean }) => list.isOfficial
				)
			);
		});
	}

	void it("applies the limit after filtering", async () => {
		const expected = visiblePublicListIds(fixture.officialOwners, "mutual");
		assert.ok(expected.length > 1);

		const response = await getAs(
			"/lists/official",
			fixture.viewers.mutual.authorization,
			{ limit: expected.length }
		);

		assert.deepEqual(sorted(listIdsOf(response)), sorted(expected));
	});
});

void describe("GET /lists/search visibility", () => {
	for (const viewerKey of ["stranger", "oneWay", "mutual"] as const) {
		void it(`finds only the public lists a ${viewerKey} may see`, async () => {
			const expected = visiblePublicListIds(
				[...fixture.owners, ...fixture.officialOwners],
				viewerKey
			);

			const response = await getAs(
				"/lists/search",
				fixture.viewers[viewerKey].authorization,
				{ query: SEARCH_TERM }
			);

			assert.equal(response.status, 200);
			assert.deepEqual(sorted(listIdsOf(response)), sorted(expected));
		});
	}
});

void describe("POST /lists/:listId/duplicate visibility", () => {
	function duplicate(listId: string, authorization: string) {
		return api()
			.post(`/lists/${listId}/duplicate`)
			.set("Authorization", authorization)
			.send({ name: "Copy" });
	}

	void it("copies a public list the viewer may see", async () => {
		const ownerCase = ownerCaseOf("friends", "friends");

		const response = await duplicate(
			ownerCase.publicList.id,
			fixture.viewers.mutual.authorization
		);

		assert.equal(response.status, 201);
	});

	void it("answers 404 LIST_NOT_FOUND for a public list hidden by the owner", async () => {
		const ownerCase = ownerCaseOf("friends", "friends");

		const response = await duplicate(
			ownerCase.publicList.id,
			fixture.viewers.oneWay.authorization
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "LIST_NOT_FOUND");
	});

	void it("keeps answering 403 LIST_FORBIDDEN for a private list of another user", async () => {
		const ownerCase = ownerCaseOf("public", "public");

		const response = await duplicate(
			ownerCase.privateList.id,
			fixture.viewers.mutual.authorization
		);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "LIST_FORBIDDEN");
	});
});
