import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
	rewindIgnoresProfileVisibility: boolean;
}

type Viewer = "anonymous" | "stranger" | "follower" | "mutual" | "owner";

const PRIVATE_PROFILE: OwnerPrivacy = {
	profileVisibility: "private",
	rewindVisibility: "public",
	platinumVisibility: "public",
	rewindIgnoresProfileVisibility: false
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

function patchToggle(enabled: boolean) {
	return api()
		.patch("/users/me")
		.set("Authorization", fixture.owner.authorization)
		.send({ rewindIgnoresProfileVisibility: enabled });
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

async function assertVisibleTo(visibleTo: Viewer[]) {
	const expected = expectedStatuses(visibleTo);
	assert.deepEqual(await detailStatuses(), expected, "detail");
	assert.deepEqual(await listingStatuses(), expected, "listing");
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

void describe("Rewind with a private profile", () => {
	void it("stays hidden from everyone but the owner while the toggle is off", async () => {
		await setOwnerPrivacy({ rewindVisibility: "public" });
		await assertVisibleTo([]);

		await setOwnerPrivacy({ rewindVisibility: "friends" });
		await assertVisibleTo([]);

		const hidden = await readRewind(ownerUsername(), 2025);
		assert.equal(hidden.body.type, "USER_PRIVATE");
	});

	void it("opens a public Rewind to every visitor once the toggle is on", async () => {
		await setOwnerPrivacy({
			rewindVisibility: "public",
			rewindIgnoresProfileVisibility: true
		});

		await assertVisibleTo(["anonymous", "stranger", "follower", "mutual"]);
	});

	void it("opens a friends Rewind only to mutual followers once the toggle is on", async () => {
		await setOwnerPrivacy({
			rewindVisibility: "friends",
			rewindIgnoresProfileVisibility: true
		});

		await assertVisibleTo(["mutual"]);
	});

	void it("keeps a private Rewind hidden even with the toggle on", async () => {
		await setOwnerPrivacy({
			rewindVisibility: "private",
			rewindIgnoresProfileVisibility: true
		});

		await assertVisibleTo([]);
	});

	void it("shows the owner name and avatar in the header of the Rewind", async () => {
		await setOwnerPrivacy({ rewindIgnoresProfileVisibility: true });

		const response = await readRewind(ownerUsername(), 2025).expect(200);

		assert.equal(response.body.data.user.username, ownerUsername());
		assert.equal(response.body.data.user.name, fixture.owner.user.name);
		assert.ok("avatarUrl" in response.body.data.user);
	});

	void it("lists only the years the owner generated", async () => {
		await setOwnerPrivacy({ rewindIgnoresProfileVisibility: true });

		const visitor = await readRewindYears(ownerUsername()).expect(200);
		const owner = await readRewindYears(
			ownerUsername(),
			fixture.owner.authorization
		).expect(200);

		const yearsOf = (response: {
			body: { data: { years: { year: number }[] } };
		}) => response.body.data.years.map(entry => entry.year);
		assert.deepEqual(yearsOf(visitor), [2025]);
		assert.deepEqual(yearsOf(owner), [2025, 2024]);
		await readRewind(ownerUsername(), 2024).expect(404);
	});

	void it("keeps the platinums hidden while the profile is private", async () => {
		await setOwnerPrivacy({
			rewindIgnoresProfileVisibility: true,
			platinumVisibility: "public"
		});

		for (const viewer of ["anonymous", "mutual"] as const) {
			const detail = await readRewind(
				ownerUsername(),
				2025,
				authorizationOf(viewer)
			).expect(200);
			const listing = await readRewindYears(
				ownerUsername(),
				authorizationOf(viewer)
			).expect(200);
			assert.equal(detail.body.data.totals.platinums, null, viewer);
			assert.notEqual(detail.body.data.persona, TROPHY_HUNTER, viewer);
			assert.notEqual(
				listing.body.data.years[0].persona,
				TROPHY_HUNTER,
				viewer
			);
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

	void it("shows the platinums again once the profile is visible", async () => {
		await setOwnerPrivacy({
			profileVisibility: "public",
			rewindIgnoresProfileVisibility: true
		});

		const detail = await readRewind(ownerUsername(), 2025).expect(200);

		assert.equal(
			detail.body.data.totals.platinums,
			TROPHY_HUNTER_MIN_PLATINUMS
		);
		assert.equal(detail.body.data.persona, TROPHY_HUNTER);
	});

	void it("keeps the profile restricted with the toggle on", async () => {
		await setOwnerPrivacy({ rewindIgnoresProfileVisibility: true });

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
});

void describe("Rewind share with a private profile", () => {
	void it("serves the generic card while the toggle is off", async () => {
		await setOwnerPrivacy({ rewindIgnoresProfileVisibility: false });
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

	void it("serves the card of the year once the toggle is on", async () => {
		await setOwnerPrivacy({ rewindIgnoresProfileVisibility: true });
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
});

void describe("PATCH /users/me rewindIgnoresProfileVisibility", () => {
	void it("starts off for a new account and is saved by PATCH", async () => {
		const account = await signUpOn("2024-01-01");

		const before = await api()
			.get("/users/me")
			.set("Authorization", account.authorization)
			.expect(200);
		await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ rewindIgnoresProfileVisibility: true })
			.expect(200);
		const after = await api()
			.get("/users/me")
			.set("Authorization", account.authorization)
			.expect(200);

		assert.equal(
			before.body.data.user.rewindIgnoresProfileVisibility,
			false
		);
		assert.equal(after.body.data.user.rewindIgnoresProfileVisibility, true);
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for a value that is not a boolean", async () => {
		for (const value of ["yes", 1, null]) {
			const response = await api()
				.patch("/users/me")
				.set("Authorization", fixture.owner.authorization)
				.send({ rewindIgnoresProfileVisibility: value });
			assert.equal(response.status, 422, String(value));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("survives the toggle flipping while visitors read in parallel", async () => {
		await setOwnerPrivacy({});
		const toggles = [true, false, true, true, false, true];

		const [patches, reads] = await Promise.all([
			Promise.all(toggles.map(enabled => patchToggle(enabled))),
			Promise.all(
				Array.from({ length: PARALLEL_READERS }, (_, index) =>
					index % 2 === 0
						? readRewind(ownerUsername(), 2025)
						: readRewindYears(ownerUsername())
				)
			)
		]);

		for (const patch of patches) assert.equal(patch.status, 200);
		for (const read of reads) {
			assert.ok([200, 403].includes(read.status), String(read.status));
			if (read.status === 403)
				assert.equal(read.body.type, "USER_PRIVATE");
		}

		await patchToggle(true).expect(200);
		await patchToggle(true).expect(200);
		await readRewind(ownerUsername(), 2025).expect(200);

		await patchToggle(false).expect(200);
		const hidden = await readRewind(ownerUsername(), 2025);
		assert.equal(hidden.status, 403);
		assert.equal(hidden.body.type, "USER_PRIVATE");
	});
});
