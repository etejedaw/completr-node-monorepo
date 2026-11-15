import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { type Platform } from "../../src/platforms/platform.model";
import {
	type RewindPersonaCode,
	TROPHY_HUNTER_MIN_PLATINUMS
} from "../../src/rewind/rewind.constants";
import { clearRewindImageCache } from "../../src/rewind-share/rewind-share.service";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { type VisibilityLevel } from "../../src/users/constants/visibility.constants";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	readRewind,
	readRewindYears,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

interface Fixture {
	owner: Account;
	follower: Account;
	mutual: Account;
	stranger: Account;
}

interface OwnerPrivacy {
	profileVisibility: VisibilityLevel;
	rewindVisibility: VisibilityLevel;
	platinumVisibility: VisibilityLevel;
}

type Viewer = "anonymous" | "stranger" | "follower" | "mutual" | "owner";

const PRIVATE_PROFILE: OwnerPrivacy = {
	profileVisibility: "private",
	rewindVisibility: "public",
	platinumVisibility: "public"
};

const VIEWERS: Viewer[] = [
	"anonymous",
	"stranger",
	"follower",
	"mutual",
	"owner"
];

const PARALLEL_READERS = 12;

const TROPHY_HUNTER: RewindPersonaCode = "trophy-hunter";

let fixture: Fixture;

function authorizationOf(viewer: Viewer): string | undefined {
	if (viewer === "anonymous") return undefined;
	return fixture[viewer].authorization;
}

function ownerUsername(): string {
	return fixture.owner.user.username;
}

async function setOwnerPrivacy(privacy: Partial<OwnerPrivacy>) {
	await User.update(
		{ ...PRIVATE_PROFILE, ...privacy },
		{ where: { id: fixture.owner.user.id } }
	);
}

async function statusesFor(
	request: (authorization?: string) => Promise<{ status: number }>
): Promise<Record<Viewer, number>> {
	const entries = await Promise.all(
		VIEWERS.map(
			async viewer =>
				[
					viewer,
					(await request(authorizationOf(viewer))).status
				] as const
		)
	);
	return Object.fromEntries(entries) as Record<Viewer, number>;
}

function patchLegacyField() {
	return api()
		.patch("/users/me")
		.set("Authorization", fixture.owner.authorization)
		.send({ rewindIgnoresProfileVisibility: true });
}

function detailStatuses() {
	return statusesFor(authorization =>
		readRewind(ownerUsername(), 2025, authorization)
	);
}

function listingStatuses() {
	return statusesFor(authorization =>
		readRewindYears(ownerUsername(), authorization)
	);
}

function expectedStatuses(visibleTo: Viewer[]): Record<Viewer, number> {
	return Object.fromEntries(
		VIEWERS.map(viewer => [
			viewer,
			viewer === "owner" || visibleTo.includes(viewer) ? 200 : 403
		])
	) as Record<Viewer, number>;
}

async function assertDetailVisibleTo(visibleTo: Viewer[]) {
	assert.deepEqual(
		await detailStatuses(),
		expectedStatuses(visibleTo),
		"detail"
	);
}

async function assertListingVisibleTo(visibleTo: Viewer[]) {
	assert.deepEqual(
		await listingStatuses(),
		expectedStatuses(visibleTo),
		"listing"
	);
}

async function seedTrophyHunterPlatinums(owner: User) {
	const games = await Promise.all(
		Array.from({ length: TROPHY_HUNTER_MIN_PLATINUMS }, () => createGame())
	);
	await GamePlatinum.bulkCreate(
		games.map(game => ({
			userId: owner.id,
			gameId: game.id,
			platinumedAt: "2025-06-01"
		}))
	);
}

async function seedRuns(owner: Account, platform: Platform) {
	const [celeste, hades, outer] = await Promise.all([
		createGame({ title: "Celeste" }),
		createGame({ title: "Hades" }),
		createGame({ title: "Outer Wilds" })
	]);
	await addRun(owner, celeste, platform, {
		startedAt: "2025-02-01",
		finishedAt: "2025-03-04"
	});
	await addRun(owner, hades, platform, {
		startedAt: "2025-04-01",
		finishedAt: "2025-05-20"
	});
	await addRun(owner, outer, platform, {
		startedAt: "2024-04-01",
		finishedAt: "2024-05-20"
	});
}

async function seedFixture() {
	const platform = await createPlatform();
	const [owner, follower, mutual, stranger] = await Promise.all([
		signUpOn("2024-01-01"),
		signUpOn("2024-01-01"),
		signUpOn("2024-01-01"),
		signUpOn("2024-01-01")
	]);
	await UserFollower.bulkCreate([
		{ followerId: follower.user.id, followingId: owner.user.id },
		{ followerId: mutual.user.id, followingId: owner.user.id },
		{ followerId: owner.user.id, followingId: mutual.user.id }
	]);
	await seedRuns(owner, platform);
	await seedTrophyHunterPlatinums(owner.user);
	await storeRewind(owner, 2025);
	fixture = { owner, follower, mutual, stranger };
	await setOwnerPrivacy({});
}

useTestDatabase(seedFixture);

beforeEach(async () => {
	clearRewindImageCache();
	await setOwnerPrivacy({});
});

void describe("Rewind with a private profile", () => {
	void it("opens the detail by link on its own level while the archive stays closed", async () => {
		await setOwnerPrivacy({ rewindVisibility: "public" });

		await assertDetailVisibleTo([
			"anonymous",
			"stranger",
			"follower",
			"mutual"
		]);
		await assertListingVisibleTo([]);
		const archive = await readRewindYears(ownerUsername());
		assert.equal(archive.body.type, "USER_PRIVATE");
	});

	void it("opens a friends Rewind only to mutual followers by link", async () => {
		await setOwnerPrivacy({ rewindVisibility: "friends" });

		await assertDetailVisibleTo(["mutual"]);
		await assertListingVisibleTo([]);
	});

	void it("shows nothing but to the owner when the Rewind is private", async () => {
		await setOwnerPrivacy({ rewindVisibility: "private" });

		await assertDetailVisibleTo([]);
		await assertListingVisibleTo([]);
		const hidden = await readRewind(ownerUsername(), 2025);
		assert.equal(hidden.body.type, "USER_PRIVATE");
	});

	void it("opens the archive again once the profile is visible", async () => {
		await setOwnerPrivacy({
			profileVisibility: "public",
			rewindVisibility: "public"
		});

		await assertDetailVisibleTo([
			"anonymous",
			"stranger",
			"follower",
			"mutual"
		]);
		await assertListingVisibleTo([
			"anonymous",
			"stranger",
			"follower",
			"mutual"
		]);
	});

	void it("shows the owner name and avatar in the header of the Rewind", async () => {
		const response = await readRewind(ownerUsername(), 2025).expect(200);

		assert.equal(response.body.data.user.username, ownerUsername());
		assert.equal(response.body.data.user.name, fixture.owner.user.name);
		assert.ok("avatarUrl" in response.body.data.user);
	});

	void it("lists only the years the owner generated to the owner", async () => {
		const owner = await readRewindYears(
			ownerUsername(),
			fixture.owner.authorization
		).expect(200);

		assert.deepEqual(
			owner.body.data.years.map((entry: { year: number }) => entry.year),
			[2025, 2024]
		);
		await readRewind(ownerUsername(), 2024).expect(404);
	});

	void it("keeps the platinums hidden while the profile is private", async () => {
		for (const viewer of ["anonymous", "mutual"] as const) {
			const detail = await readRewind(
				ownerUsername(),
				2025,
				authorizationOf(viewer)
			).expect(200);
			assert.equal(detail.body.data.totals.platinums, null, viewer);
			assert.notEqual(detail.body.data.persona, TROPHY_HUNTER, viewer);
		}

		const own = await readRewind(
			ownerUsername(),
			2025,
			fixture.owner.authorization
		).expect(200);
		assert.equal(
			own.body.data.totals.platinums,
			TROPHY_HUNTER_MIN_PLATINUMS
		);
		assert.equal(own.body.data.persona, TROPHY_HUNTER);
	});

	void it("keeps the platinums hidden when the section is closed even with a public profile", async () => {
		await setOwnerPrivacy({
			profileVisibility: "public",
			platinumVisibility: "private"
		});

		const detail = await readRewind(ownerUsername(), 2025).expect(200);

		assert.equal(detail.body.data.totals.platinums, null);
		assert.notEqual(detail.body.data.persona, TROPHY_HUNTER);
	});

	void it("shows the platinums again once the profile is visible", async () => {
		await setOwnerPrivacy({ profileVisibility: "public" });

		const detail = await readRewind(ownerUsername(), 2025).expect(200);

		assert.equal(
			detail.body.data.totals.platinums,
			TROPHY_HUNTER_MIN_PLATINUMS
		);
		assert.equal(detail.body.data.persona, TROPHY_HUNTER);
	});

	void it("keeps the profile restricted while the Rewind opens by link", async () => {
		for (const viewer of ["anonymous", "follower", "mutual"] as const) {
			const request = api().get(`/users/${ownerUsername()}`);
			const authorization = authorizationOf(viewer);
			const profile = await (
				authorization
					? request.set("Authorization", authorization)
					: request
			).expect(200);
			assert.equal(profile.body.data.isPrivate, true, viewer);
			assert.equal("backlogs" in profile.body.data, false, viewer);
			assert.equal("access" in profile.body.data, false, viewer);
		}

		const backlog = await api().get(`/users/${ownerUsername()}/backlog`);
		assert.equal(backlog.status, 403);
		assert.equal(backlog.body.type, "USER_PRIVATE");
	});

	void it("survives a visitor asking for the archive and the detail back to back", async () => {
		const sequence = await Promise.all(
			Array.from({ length: PARALLEL_READERS }, (_, index) =>
				index % 2 === 0
					? readRewindYears(ownerUsername())
					: readRewind(ownerUsername(), 2025)
			)
		);

		sequence.forEach((response, index) => {
			assert.equal(response.status, index % 2 === 0 ? 403 : 200);
		});
		const after = await readRewindYears(ownerUsername());
		assert.equal(after.status, 403);
		assert.equal(after.body.type, "USER_PRIVATE");
	});
});

void describe("Rewind share with a private profile", () => {
	void it("serves the card of the year by link while the Rewind is public", async () => {
		clearRewindImageCache();

		const page = await api()
			.get(`/share/rewind/${ownerUsername()}/2025`)
			.expect(200);
		const image = await api()
			.get(`/share/rewind/${ownerUsername()}/2025/og.png`)
			.buffer(true)
			.expect(200);
		const list = await api()
			.get(`/share/rewind/${ownerUsername()}/2025/story-list.png`)
			.buffer(true)
			.expect(200);

		assert.match(
			page.text,
			new RegExp(`/share/rewind/${ownerUsername()}/2025/og\\.png`)
		);
		assert.match(page.text, /2 games finished/);
		assert.equal(image.headers["content-type"], "image/png");
		assert.equal(list.headers["content-type"], "image/png");
	});

	void it("serves the generic card when the Rewind is private", async () => {
		await setOwnerPrivacy({ rewindVisibility: "private" });
		clearRewindImageCache();

		const page = await api()
			.get(`/share/rewind/${ownerUsername()}/2025`)
			.expect(200);
		const image = await api().get(
			`/share/rewind/${ownerUsername()}/2025/og.png`
		);
		const list = await api().get(
			`/share/rewind/${ownerUsername()}/2025/story-list.png`
		);

		assert.match(page.text, /<title>Completr Rewind<\/title>/);
		assert.doesNotMatch(page.text, /og:image/);
		assert.doesNotMatch(page.text, /Celeste/);
		assert.equal(image.status, 403);
		assert.equal(image.body.type, "USER_PRIVATE");
		assert.equal(list.status, 403);
		assert.equal(list.body.type, "USER_PRIVATE");
	});
});

void describe("PATCH /users/me with the removed rewindIgnoresProfileVisibility", () => {
	void it("answers 422 COMMON_SCHEMA_INVALID for the unknown field", async () => {
		const response = await patchLegacyField();

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("does not return the field in the account", async () => {
		const account = await api()
			.get("/users/me")
			.set("Authorization", fixture.owner.authorization)
			.expect(200);

		assert.equal(
			"rewindIgnoresProfileVisibility" in account.body.data.user,
			false
		);
	});
});
