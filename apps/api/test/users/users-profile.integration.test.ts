import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { type Game } from "../../src/games/game.model";
import { ListFollower } from "../../src/list-followers/list-follower.model";
import { ListItem } from "../../src/list-items/list-item.model";
import { type List } from "../../src/lists/list.model";
import { type Platform } from "../../src/platforms/platform.model";
import { Review } from "../../src/reviews/review.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createFranchise,
	createGame,
	createList,
	createPlatform,
	createScoreSource
} from "../helpers/factories.helper";

let scoreSource: string;

useTestDatabase(async () => {
	const source = await createScoreSource();
	scoreSource = source.code;
});

type QueryParams = Record<string, string | number>;

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

type OwnerKey =
	"open" | "closed" | "friends" | "backlogPrivate" | "backlogFriends";

type ViewerKey =
	"anonymous" | "stranger" | "pending" | "follower" | "mutual" | "self";

type RelatedViewerKey = Exclude<ViewerKey, "anonymous" | "self">;

interface OwnerCase {
	key: OwnerKey;
	description: string;
	allowedOnBacklogSections: ViewerKey[];
	allowedOnProfileOnlySections: ViewerKey[];
}

interface OwnerLists {
	publicList: List;
	privateList: List;
}

interface Fixture {
	owners: Record<OwnerKey, Account>;
	viewers: Record<RelatedViewerKey, Account>;
	lists: Record<OwnerKey, OwnerLists>;
}

interface EntryOverrides {
	status?: BacklogStatus;
	finishedAt?: string;
	realDuration?: number;
	score?: number;
	userRating?: number;
	notes?: string;
	isPublic?: boolean;
}

interface BacklogEntryBody {
	id: string;
	notes?: string;
	hasReview?: boolean;
	reviewContent?: string | null;
	review?: { content: string | null; rating: number | null } | null;
	game: { id: string };
}

interface ListItemBody {
	game: { id: string };
	position: number;
	backlogStatus: string | null;
}

const ALL_VIEWERS: ViewerKey[] = [
	"anonymous",
	"stranger",
	"pending",
	"follower",
	"mutual",
	"self"
];

const OWNER_CASES: OwnerCase[] = [
	{
		key: "open",
		description: "a public profile",
		allowedOnBacklogSections: ALL_VIEWERS,
		allowedOnProfileOnlySections: ALL_VIEWERS
	},
	{
		key: "closed",
		description: "a private profile",
		allowedOnBacklogSections: ["self"],
		allowedOnProfileOnlySections: ["self"]
	},
	{
		key: "friends",
		description: "a friends-only profile",
		allowedOnBacklogSections: ["mutual", "self"],
		allowedOnProfileOnlySections: ["mutual", "self"]
	},
	{
		key: "backlogPrivate",
		description: "a private backlog",
		allowedOnBacklogSections: ["self"],
		allowedOnProfileOnlySections: ALL_VIEWERS
	},
	{
		key: "backlogFriends",
		description: "a friends-only backlog",
		allowedOnBacklogSections: ["mutual", "self"],
		allowedOnProfileOnlySections: ALL_VIEWERS
	}
];

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH_START = `${TODAY.slice(0, 7)}-01T00:00:00.000Z`;

let platform: Platform;
let fixture: Fixture;

function getAs(path: string, authorization?: string) {
	const request = api().get(path);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function authorizationOf(
	viewerKey: ViewerKey,
	owner: Account
): string | undefined {
	if (viewerKey === "anonymous") return undefined;
	if (viewerKey === "self") return owner.authorization;
	return fixture.viewers[viewerKey].authorization;
}

async function follow(follower: Account, target: Account) {
	const response = await api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization)
		.expect(201);
	return response.body.data.status as "accepted" | "pending";
}

async function followAndAccept(follower: Account, target: Account) {
	if ((await follow(follower, target)) === "accepted") return;
	await api()
		.post(`/users/me/follow-requests/${follower.user.id}/accept`)
		.set("Authorization", target.authorization)
		.expect(204);
}

function createEntry(
	userId: string,
	game: Game,
	overrides: EntryOverrides = {}
) {
	return Backlog.create({
		userId,
		gameId: game.id,
		platformId: platform.id,
		status: "completed",
		score: 4,
		duration: 10,
		isPublic: true,
		...overrides
	});
}

async function addListItems(list: List, games: Game[]) {
	await ListItem.bulkCreate(
		games.map((game, index) => ({
			listId: list.id,
			gameId: game.id,
			position: index + 1
		}))
	);
}

async function createOwnerLists(owner: Account): Promise<OwnerLists> {
	const publicList = await createList(owner.user.id, scoreSource, {
		isPublic: true
	});
	const privateList = await createList(owner.user.id, scoreSource, {
		isPublic: false
	});
	return { publicList, privateList };
}

async function buildFixture(): Promise<Fixture> {
	platform = await createPlatform();
	const [open, closed, friends, backlogPrivate, backlogFriends] =
		await Promise.all(
			Array.from({ length: 5 }, () => createUserWithSession())
		);
	const [stranger, pending, follower, mutual] = await Promise.all(
		Array.from({ length: 4 }, () => createUserWithSession())
	);
	const owners = {
		open: open!,
		closed: closed!,
		friends: friends!,
		backlogPrivate: backlogPrivate!,
		backlogFriends: backlogFriends!
	};
	const viewers = {
		stranger: stranger!,
		pending: pending!,
		follower: follower!,
		mutual: mutual!
	};

	await owners.closed.user.update({ profileVisibility: "private" });
	await owners.friends.user.update({ profileVisibility: "friends" });
	await owners.backlogPrivate.user.update({ backlogVisibility: "private" });
	await owners.backlogFriends.user.update({ backlogVisibility: "friends" });

	for (const owner of Object.values(owners)) {
		await followAndAccept(viewers.follower, owner);
		await followAndAccept(viewers.mutual, owner);
		await follow(owner, viewers.mutual);
	}
	await follow(viewers.pending, owners.closed);

	const lists = {
		open: await createOwnerLists(owners.open),
		closed: await createOwnerLists(owners.closed),
		friends: await createOwnerLists(owners.friends),
		backlogPrivate: await createOwnerLists(owners.backlogPrivate),
		backlogFriends: await createOwnerLists(owners.backlogFriends)
	};
	return { owners, viewers, lists };
}

function expectAccess(
	response: { status: number; body: { type?: string } },
	allowed: boolean,
	label: string
) {
	if (allowed) {
		assert.equal(response.status, 200, label);
		return;
	}
	assert.equal(response.status, 403, label);
	assert.equal(response.body.type, "USER_PRIVATE", label);
}

function itEnforcesVisibility(
	pathFor: (key: OwnerKey, owner: Account) => string,
	allowedFor: (ownerCase: OwnerCase) => ViewerKey[]
) {
	for (const ownerCase of OWNER_CASES) {
		void it(`enforces the visibility of ${ownerCase.description}`, async () => {
			const owner = fixture.owners[ownerCase.key];
			const allowedViewers = allowedFor(ownerCase);

			for (const viewerKey of ALL_VIEWERS) {
				const response = await getAs(
					pathFor(ownerCase.key, owner),
					authorizationOf(viewerKey, owner)
				);
				expectAccess(
					response,
					allowedViewers.includes(viewerKey),
					`${viewerKey} viewing ${ownerCase.description}`
				);
			}
		});
	}
}

function itAnswersNotFoundForMissingUser(
	pathForUsername: (name: string) => string
) {
	void it("answers 404 USER_NOT_FOUND for a user that does not exist", async () => {
		const username = `ghost_${randomUUID().slice(0, 5)}`;

		const anonymous = await getAs(pathForUsername(username));
		const authenticated = await getAs(
			pathForUsername(username),
			fixture.viewers.stranger.authorization
		);

		for (const response of [anonymous, authenticated]) {
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		}
	});
}

function idsOf(entries: BacklogEntryBody[]) {
	return entries.map(entry => entry.id);
}

function sorted(values: string[]) {
	return values.toSorted();
}

interface OpenOwnerSeed {
	publicToday: Backlog;
	privateToday: Backlog;
	march20: Backlog;
	march15Private: Backlog;
	march10: Backlog;
	franchises: {
		tracked: { id: string; name: string; code: string };
		trackedEmpty: { id: string; name: string; code: string };
	};
}

let openSeed: OpenOwnerSeed;

async function seedCompletedEntries(owner: Account) {
	const userId = owner.user.id;
	const [g1, g2, g3, g4, g5, g6, g7, g8] = await Promise.all(
		Array.from({ length: 8 }, () => createGame())
	);
	const publicToday = await createEntry(userId, g1!, {
		finishedAt: TODAY,
		realDuration: 10,
		userRating: 4,
		notes: "private notes"
	});
	const privateToday = await createEntry(userId, g2!, {
		finishedAt: TODAY,
		realDuration: 50,
		userRating: 5,
		isPublic: false
	});
	const march20 = await createEntry(userId, g3!, {
		finishedAt: "2024-03-20",
		realDuration: 30,
		userRating: 2
	});
	const march15Private = await createEntry(userId, g4!, {
		finishedAt: "2024-03-15",
		realDuration: 99,
		userRating: 5,
		isPublic: false
	});
	const march10 = await createEntry(userId, g5!, {
		finishedAt: "2024-03-10",
		realDuration: 20,
		userRating: 3
	});
	await createEntry(userId, g6!, { status: "playing" });
	await createEntry(userId, g7!, { status: "completed" });
	await createEntry(userId, g8!, { status: "abandoned", finishedAt: TODAY });
	await Review.create({
		userId,
		gameId: g1!.id,
		content: "Loved it",
		rating: 4.5
	});
	return { publicToday, privateToday, march20, march15Private, march10 };
}

async function seedFranchises(owner: Account) {
	const userId = owner.user.id;
	const tracked = await createFranchise({ name: `A ${randomUUID()}` });
	const trackedEmpty = await createFranchise({ name: `B ${randomUUID()}` });
	const untracked = await createFranchise();
	const [a1, a2, a3, a4, b1, u1] = await Promise.all(
		Array.from({ length: 6 }, () => createGame())
	);
	const inactiveGame = await createGame({ isActive: false });
	await Promise.all(
		[a1!, a2!, a3!, a4!, inactiveGame].map(game =>
			game.update({ franchiseId: tracked.id })
		)
	);
	await b1!.update({ franchiseId: trackedEmpty.id });
	await u1!.update({ franchiseId: untracked.id });
	await createEntry(userId, a1!);
	await createEntry(userId, a2!, { isPublic: false });
	await createEntry(userId, a3!, { status: "abandoned" });
	await createEntry(userId, a4!, { status: "not_started" });
	await createEntry(userId, u1!);
	for (const franchise of [tracked, trackedEmpty]) {
		await api()
			.post(`/franchises/${franchise.code}/track`)
			.set("Authorization", owner.authorization)
			.expect(204);
	}
	return {
		tracked: pickFranchise(tracked),
		trackedEmpty: pickFranchise(trackedEmpty)
	};
}

function pickFranchise(franchise: { id: string; name: string; code: string }) {
	return { id: franchise.id, name: franchise.name, code: franchise.code };
}

async function seedOpenOwnerLists(owner: Account) {
	const userId = owner.user.id;
	const [completedPublic, completedPrivate, untouched] = await Promise.all([
		createGame(),
		createGame(),
		createGame()
	]);
	await createEntry(userId, completedPublic);
	await createEntry(userId, completedPrivate, { isPublic: false });
	const { publicList } = fixture.lists.open;
	await addListItems(publicList, [
		completedPublic,
		completedPrivate,
		untouched
	]);
	await ListFollower.create({
		listId: publicList.id,
		userId: fixture.viewers.follower.user.id
	});
	return [completedPublic, completedPrivate, untouched];
}

async function seedBacklogPrivateList(owner: Account) {
	const game = await createGame();
	await createEntry(owner.user.id, game);
	await addListItems(fixture.lists.backlogPrivate.publicList, [game]);
}

void describe("public profile endpoints", () => {
	let openListGames: Game[];

	before(async () => {
		fixture = await buildFixture();
		const openOwner = fixture.owners.open;
		const entries = await seedCompletedEntries(openOwner);
		const franchises = await seedFranchises(openOwner);
		openSeed = { ...entries, franchises };
		openListGames = await seedOpenOwnerLists(openOwner);
		await seedBacklogPrivateList(fixture.owners.backlogPrivate);
	});

	void describe("GET /users/:username/highlights", () => {
		function highlights(
			username: string,
			authorization?: string,
			query: QueryParams = {}
		) {
			return getAs(`/users/${username}/highlights`, authorization).query(
				query
			);
		}

		itEnforcesVisibility(
			(_key, owner) => `/users/${owner.user.username}/highlights`,
			ownerCase => ownerCase.allowedOnBacklogSections
		);

		itAnswersNotFoundForMissingUser(name => `/users/${name}/highlights`);

		void it("serves the public completions of the current month to a visitor without notes", async () => {
			const { open } = fixture.owners;

			const response = await highlights(open.user.username);

			assert.equal(response.status, 200);
			const { recent, month } = response.body.data.highlights;
			assert.deepEqual(idsOf(recent), [
				openSeed.publicToday.id,
				openSeed.march20.id,
				openSeed.march10.id
			]);
			assert.ok(recent.every((entry: object) => !("notes" in entry)));
			assert.equal(month.startsAt, CURRENT_MONTH_START);
			assert.equal(month.completedCount, 1);
			assert.equal(month.longestPlayed.id, openSeed.publicToday.id);
			assert.equal(month.bestPersonalRatio.id, openSeed.publicToday.id);
			assert.equal(month.highestRated.id, openSeed.publicToday.id);
		});

		void it("includes the private completions and the notes for the owner", async () => {
			const { open } = fixture.owners;

			const response = await highlights(
				open.user.username,
				open.authorization
			);

			assert.equal(response.status, 200);
			const { recent, month } = response.body.data.highlights;
			assert.deepEqual(
				sorted(idsOf(recent)),
				sorted([
					openSeed.publicToday.id,
					openSeed.privateToday.id,
					openSeed.march20.id,
					openSeed.march15Private.id,
					openSeed.march10.id
				])
			);
			const publicEntry = recent.find(
				(entry: BacklogEntryBody) =>
					entry.id === openSeed.publicToday.id
			);
			assert.equal(publicEntry.notes, "private notes");
			assert.equal(month.completedCount, 2);
			assert.equal(month.longestPlayed.id, openSeed.privateToday.id);
			assert.equal(month.bestPersonalRatio.id, openSeed.publicToday.id);
			assert.equal(month.highestRated.id, openSeed.privateToday.id);
		});

		void it("computes the month stats of a requested year and month ignoring private entries for visitors", async () => {
			const { open } = fixture.owners;

			const visitor = await highlights(open.user.username, undefined, {
				year: 2024,
				month: 3
			});
			const owner = await highlights(
				open.user.username,
				open.authorization,
				{ year: 2024, month: 3 }
			);

			const visitorMonth = visitor.body.data.highlights.month;
			assert.equal(visitorMonth.startsAt, "2024-03-01T00:00:00.000Z");
			assert.equal(visitorMonth.endsAt, "2024-03-31T23:59:59.999Z");
			assert.equal(visitorMonth.completedCount, 2);
			assert.equal(visitorMonth.longestPlayed.id, openSeed.march20.id);
			assert.equal(
				visitorMonth.bestPersonalRatio.id,
				openSeed.march10.id
			);
			assert.equal(visitorMonth.highestRated.id, openSeed.march10.id);
			const ownerMonth = owner.body.data.highlights.month;
			assert.equal(ownerMonth.completedCount, 3);
			assert.equal(
				ownerMonth.longestPlayed.id,
				openSeed.march15Private.id
			);
			assert.equal(ownerMonth.bestPersonalRatio.id, openSeed.march10.id);
			assert.equal(
				ownerMonth.highestRated.id,
				openSeed.march15Private.id
			);
		});

		void it("answers an empty month with null highlights", async () => {
			const { open } = fixture.owners;

			const response = await highlights(open.user.username, undefined, {
				year: 2020,
				month: 1
			});

			assert.equal(response.status, 200);
			const { month } = response.body.data.highlights;
			assert.equal(month.completedCount, 0);
			assert.equal(month.longestPlayed, null);
			assert.equal(month.bestPersonalRatio, null);
			assert.equal(month.highestRated, null);
		});

		void it("picks the highest personal ratio of the month over the longest played one", async () => {
			const player = await createUserWithSession();
			const [slow, fast, unplayed] = await Promise.all(
				Array.from({ length: 3 }, () => createGame())
			);
			await createEntry(player.user.id, slow!, {
				finishedAt: "2022-06-10",
				score: 5,
				realDuration: 40
			});
			const best = await createEntry(player.user.id, fast!, {
				finishedAt: "2022-06-12",
				score: 4,
				realDuration: 5
			});
			await createEntry(player.user.id, unplayed!, {
				finishedAt: "2022-06-14"
			});

			const response = await highlights(
				player.user.username,
				player.authorization,
				{ year: 2022, month: 6 }
			);

			const { month } = response.body.data.highlights;
			assert.equal(month.completedCount, 3);
			assert.equal(month.bestPersonalRatio.id, best.id);
			assert.equal(month.bestPersonalRatio.personalRatio, 16);
		});

		void it("answers a null best personal ratio when no completion has a real duration", async () => {
			const player = await createUserWithSession();
			const game = await createGame();
			await createEntry(player.user.id, game, {
				finishedAt: "2022-07-10"
			});

			const response = await highlights(
				player.user.username,
				player.authorization,
				{ year: 2022, month: 7 }
			);

			const { month } = response.body.data.highlights;
			assert.equal(month.completedCount, 1);
			assert.equal(month.bestPersonalRatio, null);
			assert.equal(month.longestPlayed, null);
		});

		void it("rejects an incomplete or out of range month with 422 COMMON_SCHEMA_INVALID", async () => {
			const { open } = fixture.owners;
			const invalidQueries: QueryParams[] = [
				{ year: 2024 },
				{ month: 3 },
				{ year: 2024, month: 0 },
				{ year: 2024, month: 13 },
				{ year: 1969, month: 1 },
				{ year: 10000, month: 1 },
				{ year: "abc", month: 1 },
				{ year: 2024, month: 3, day: 1 }
			];

			for (const query of invalidQueries) {
				const response = await highlights(
					open.user.username,
					undefined,
					query
				);
				assert.equal(response.status, 422, JSON.stringify(query));
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			}
		});
	});

	void describe("GET /users/:username/completions", () => {
		function completions(
			username: string,
			authorization?: string,
			query: QueryParams = {}
		) {
			return getAs(`/users/${username}/completions`, authorization).query(
				query
			);
		}

		itEnforcesVisibility(
			(_key, owner) => `/users/${owner.user.username}/completions`,
			ownerCase => ownerCase.allowedOnBacklogSections
		);

		itAnswersNotFoundForMissingUser(name => `/users/${name}/completions`);

		void it("lists the public finished completions newest first with the review and without notes", async () => {
			const { open } = fixture.owners;

			const response = await completions(open.user.username);

			assert.equal(response.status, 200);
			const items: BacklogEntryBody[] = response.body.data.completions;
			assert.equal(response.body.data.total, 3);
			assert.deepEqual(idsOf(items), [
				openSeed.publicToday.id,
				openSeed.march20.id,
				openSeed.march10.id
			]);
			assert.ok(items.every(item => !("notes" in item)));
			assert.equal(items[0]!.hasReview, true);
			assert.equal(items[0]!.reviewContent, "Loved it");
			assert.deepEqual(items[0]!.review, {
				content: "Loved it",
				rating: 4.5
			});
			assert.equal(items[1]!.hasReview, false);
			assert.equal(items[1]!.review, null);
		});

		void it("skips completions without a finish date and entries in other statuses", async () => {
			const { open } = fixture.owners;

			const response = await completions(
				open.user.username,
				open.authorization
			);

			assert.equal(response.body.data.total, 5);
			const items: BacklogEntryBody[] = response.body.data.completions;
			assert.ok(items.every(item => "notes" in item));
			assert.equal(
				items.find(item => item.id === openSeed.publicToday.id)!.notes,
				"private notes"
			);
		});

		void it("paginates keeping the total of the whole set", async () => {
			const { open } = fixture.owners;

			const secondPage = await completions(
				open.user.username,
				undefined,
				{
					limit: 1,
					offset: 1
				}
			);
			const beyond = await completions(open.user.username, undefined, {
				limit: 5,
				offset: 10
			});

			assert.deepEqual(idsOf(secondPage.body.data.completions), [
				openSeed.march20.id
			]);
			assert.equal(secondPage.body.data.total, 3);
			assert.deepEqual(beyond.body.data.completions, []);
			assert.equal(beyond.body.data.total, 3);
		});

		void it("rejects an invalid pagination with 422 COMMON_SCHEMA_INVALID", async () => {
			const { open } = fixture.owners;
			const invalidQueries: QueryParams[] = [
				{ limit: 0 },
				{ limit: 101 },
				{ limit: "many" },
				{ offset: -1 }
			];

			for (const query of invalidQueries) {
				const response = await completions(
					open.user.username,
					undefined,
					query
				);
				assert.equal(response.status, 422, JSON.stringify(query));
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			}
		});
	});

	void describe("GET /users/:username/franchises", () => {
		function franchises(username: string, authorization?: string) {
			return getAs(`/users/${username}/franchises`, authorization);
		}

		itEnforcesVisibility(
			(_key, owner) => `/users/${owner.user.username}/franchises`,
			ownerCase => ownerCase.allowedOnProfileOnlySections
		);

		void it("hides the tracked franchises by their own visibility, not by the backlog", async () => {
			const { open } = fixture.owners;
			const { stranger, follower, mutual } = fixture.viewers;
			const statusFor = async (authorization?: string) =>
				(await franchises(open.user.username, authorization)).status;

			try {
				await open.user.update({ franchiseVisibility: "friends" });
				assert.equal(await statusFor(), 403);
				assert.equal(await statusFor(stranger.authorization), 403);
				assert.equal(await statusFor(follower.authorization), 403);
				assert.equal(await statusFor(mutual.authorization), 200);
				assert.equal(await statusFor(open.authorization), 200);

				await open.user.update({ franchiseVisibility: "private" });
				const hidden = await franchises(
					open.user.username,
					mutual.authorization
				);
				assert.equal(hidden.status, 403);
				assert.equal(hidden.body.type, "USER_PRIVATE");
				assert.equal(await statusFor(open.authorization), 200);
			} finally {
				await open.user.update({ franchiseVisibility: "public" });
			}
		});

		void it("keeps the tracked franchises visible when only the backlog is private", async () => {
			const { backlogPrivate } = fixture.owners;

			const response = await franchises(backlogPrivate.user.username);

			assert.equal(response.status, 200);
		});

		itAnswersNotFoundForMissingUser(name => `/users/${name}/franchises`);

		void it("lists the tracked franchises by name with their active game count and no progress", async () => {
			const { open } = fixture.owners;

			const response = await franchises(open.user.username);

			assert.equal(response.status, 200);
			assert.equal(response.body.data.total, 2);
			assert.deepEqual(response.body.data.franchises, [
				{ franchise: openSeed.franchises.tracked, gameCount: 4 },
				{ franchise: openSeed.franchises.trackedEmpty, gameCount: 1 }
			]);
		});

		void it("answers an empty list when the user tracks no franchise", async () => {
			const { stranger } = fixture.viewers;

			const response = await franchises(stranger.user.username);

			assert.equal(response.status, 200);
			assert.deepEqual(response.body.data, { franchises: [], total: 0 });
		});
	});

	void describe("GET /users/:username/lists/:listId", () => {
		function listDetail(
			username: string,
			listId: string,
			authorization?: string
		) {
			return getAs(`/users/${username}/lists/${listId}`, authorization);
		}

		itEnforcesVisibility(
			(key, owner) =>
				`/users/${owner.user.username}/lists/${fixture.lists[key].publicList.id}`,
			ownerCase => ownerCase.allowedOnProfileOnlySections
		);

		itAnswersNotFoundForMissingUser(
			name => `/users/${name}/lists/${randomUUID()}`
		);

		void it("serves a public list with its items, followers and the backlog progress of its owner", async () => {
			const { open } = fixture.owners;
			const { publicList } = fixture.lists.open;

			const response = await listDetail(
				open.user.username,
				publicList.id
			);

			assert.equal(response.status, 200);
			const { list, profileUser } = response.body.data;
			assert.deepEqual(profileUser, {
				username: open.user.username,
				name: open.user.name
			});
			assert.equal(list.id, publicList.id);
			assert.equal(list.userId, open.user.id);
			assert.equal(list.isPublic, true);
			assert.equal(list.owner.username, open.user.username);
			assert.equal(list.scoreSource, scoreSource);
			assert.equal(list.followerCount, 1);
			assert.equal(list.isFollowing, false);
			assert.deepEqual(list.progress, { completed: 1, total: 3 });
			const items: ListItemBody[] = list.items;
			assert.deepEqual(
				items.map(item => item.game.id),
				openListGames.map(game => game.id)
			);
			assert.deepEqual(
				items.map(item => item.position),
				[1, 2, 3]
			);
			assert.deepEqual(
				items.map(item => item.backlogStatus),
				["completed", null, null]
			);
		});

		void it("flags whether the viewer follows the list", async () => {
			const { open } = fixture.owners;
			const { publicList } = fixture.lists.open;

			const follower = await listDetail(
				open.user.username,
				publicList.id,
				fixture.viewers.follower.authorization
			);
			const stranger = await listDetail(
				open.user.username,
				publicList.id,
				fixture.viewers.stranger.authorization
			);

			assert.equal(follower.body.data.list.isFollowing, true);
			assert.equal(stranger.body.data.list.isFollowing, false);
		});

		void it("counts the private backlog entries in the progress of the owner", async () => {
			const { open } = fixture.owners;
			const { publicList } = fixture.lists.open;

			const response = await listDetail(
				open.user.username,
				publicList.id,
				open.authorization
			);

			assert.deepEqual(response.body.data.list.progress, {
				completed: 2,
				total: 3
			});
			assert.deepEqual(
				response.body.data.list.items.map(
					(item: ListItemBody) => item.backlogStatus
				),
				["completed", "completed", null]
			);
		});

		void it("hides the backlog progress when the backlog section is not visible", async () => {
			const { backlogPrivate } = fixture.owners;
			const { publicList } = fixture.lists.backlogPrivate;

			const visitor = await listDetail(
				backlogPrivate.user.username,
				publicList.id,
				fixture.viewers.stranger.authorization
			);
			const owner = await listDetail(
				backlogPrivate.user.username,
				publicList.id,
				backlogPrivate.authorization
			);

			assert.equal(visitor.status, 200);
			assert.equal(visitor.body.data.list.progress, null);
			assert.equal(visitor.body.data.list.items[0].backlogStatus, null);
			assert.deepEqual(owner.body.data.list.progress, {
				completed: 1,
				total: 1
			});
			assert.equal(
				owner.body.data.list.items[0].backlogStatus,
				"completed"
			);
		});

		void it("serves a private list only to its owner and hides it as a missing one to everyone else", async () => {
			const { open } = fixture.owners;
			const { privateList } = fixture.lists.open;

			const owner = await listDetail(
				open.user.username,
				privateList.id,
				open.authorization
			);
			assert.equal(owner.status, 200);
			assert.equal(owner.body.data.list.isPublic, false);

			for (const viewerKey of ALL_VIEWERS.filter(key => key !== "self")) {
				const response = await listDetail(
					open.user.username,
					privateList.id,
					authorizationOf(viewerKey, open)
				);
				assert.equal(response.status, 404, viewerKey);
				assert.equal(response.body.type, "LIST_NOT_FOUND", viewerKey);
			}
		});

		void it("keeps a private list of a private profile closed behind the profile gate", async () => {
			const { closed } = fixture.owners;
			const { privateList } = fixture.lists.closed;

			const owner = await listDetail(
				closed.user.username,
				privateList.id,
				closed.authorization
			);
			const mutual = await listDetail(
				closed.user.username,
				privateList.id,
				fixture.viewers.mutual.authorization
			);

			assert.equal(owner.status, 200);
			assert.equal(mutual.status, 403);
			assert.equal(mutual.body.type, "USER_PRIVATE");
		});

		void it("answers 404 LIST_NOT_FOUND for a list that does not exist", async () => {
			const { open } = fixture.owners;

			const response = await listDetail(open.user.username, randomUUID());

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "LIST_NOT_FOUND");
		});

		void it("rejects a malformed list id with 422 COMMON_SCHEMA_INVALID", async () => {
			const { open } = fixture.owners;

			const response = await listDetail(open.user.username, "not-a-uuid");

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});

		void it("answers 404 when the list belongs to another user than the one in the path", async () => {
			const { open } = fixture.owners;
			const foreignList = fixture.lists.backlogFriends.publicList;

			const response = await listDetail(
				open.user.username,
				foreignList.id,
				fixture.viewers.stranger.authorization
			);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "LIST_NOT_FOUND");
		});

		void it("does not serve the private list of its owner under another profile", async () => {
			const { open, backlogFriends } = fixture.owners;
			const { privateList } = fixture.lists.backlogFriends;

			const response = await listDetail(
				open.user.username,
				privateList.id,
				backlogFriends.authorization
			);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "LIST_NOT_FOUND");
		});
	});
});
