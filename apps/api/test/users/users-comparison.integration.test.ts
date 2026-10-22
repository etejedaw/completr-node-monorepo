import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { Favorite } from "../../src/favorites/favorite.model";
import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { type ComparisonDimension } from "../../src/users/schemas/comparison-query.schema";
import { api } from "../helpers/app.helper";
import { bearer, createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createWishlistEntries
} from "../helpers/factories.helper";

let platform: Platform;

useTestDatabase(async () => {
	platform = await createPlatform();
});

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

type QueryParams = Record<string, string | number>;

type VisibilityField =
	| "backlogVisibility"
	| "shelfVisibility"
	| "favoriteVisibility"
	| "wishlistVisibility";

interface GameEntryBody {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null;
}

interface ComparisonBody {
	by: string;
	inCommon: GameEntryBody[];
	onlyViewer: GameEntryBody[];
	onlyTarget: GameEntryBody[];
	counts: { inCommon: number; onlyViewer: number; onlyTarget: number };
}

interface SectionCase {
	by: ComparisonDimension;
	field: VisibilityField;
	unaffectedBy: ComparisonDimension;
}

type Seeder = (
	userId: string,
	game: Game,
	isPublic: boolean
) => Promise<unknown>;

const DIMENSIONS: ComparisonDimension[] = [
	"completed",
	"playing",
	"not_started",
	"shelf",
	"favorites",
	"wishlist"
];

const SECTION_CASES: SectionCase[] = [
	{ by: "completed", field: "backlogVisibility", unaffectedBy: "wishlist" },
	{ by: "playing", field: "backlogVisibility", unaffectedBy: "wishlist" },
	{ by: "not_started", field: "backlogVisibility", unaffectedBy: "wishlist" },
	{ by: "shelf", field: "shelfVisibility", unaffectedBy: "completed" },
	{ by: "favorites", field: "favoriteVisibility", unaffectedBy: "completed" },
	{ by: "wishlist", field: "wishlistVisibility", unaffectedBy: "completed" }
];

let nextFavoritePosition = 1;

function backlogSeeder(status: BacklogStatus): Seeder {
	return (userId, game, isPublic) =>
		Backlog.create({
			userId,
			gameId: game.id,
			platformId: platform.id,
			status,
			score: 4,
			duration: 10,
			isPublic
		});
}

const SEEDERS: Record<ComparisonDimension, Seeder> = {
	completed: backlogSeeder("completed"),
	playing: backlogSeeder("playing"),
	not_started: backlogSeeder("not_started"),
	shelf: (userId, game, isPublic) =>
		GameShelf.create({
			userId,
			gameId: game.id,
			platformId: platform.id,
			isPublic
		}),
	favorites: (userId, game) =>
		Favorite.create({
			userId,
			gameId: game.id,
			position: nextFavoritePosition++
		}),
	wishlist: (userId, game) => createWishlistEntries(userId, [game.id])
};

function compare(viewer: Account, username: string, query: QueryParams = {}) {
	return api()
		.get(`/users/${username}/comparison`)
		.query(query)
		.set("Authorization", viewer.authorization);
}

async function compareOk(
	viewer: Account,
	target: Account,
	query: QueryParams = {}
) {
	const response = await compare(viewer, target.user.username, query);
	assert.equal(response.status, 200);
	return response.body.data as ComparisonBody;
}

async function seed(
	by: ComparisonDimension,
	account: Account,
	games: Game[],
	isPublic = true
) {
	for (const game of games) {
		await SEEDERS[by](account.user.id, game, isPublic);
	}
}

function createGames(count: number) {
	return Promise.all(Array.from({ length: count }, () => createGame()));
}

function idsOf(entries: GameEntryBody[]) {
	return entries.map(entry => entry.id).toSorted();
}

function idsOfGames(games: Game[]) {
	return games.map(game => game.id).toSorted();
}

async function follow(follower: Account, target: Account) {
	const response = await api()
		.post(`/users/${target.user.username}/follow`)
		.set("Authorization", follower.authorization)
		.expect(201);
	return response.body.data.status as "accepted" | "pending";
}

async function becomeMutual(first: Account, second: Account) {
	await follow(first, second);
	await follow(second, first);
}

async function expectPrivate(viewer: Account, target: Account, by: string) {
	const response = await compare(viewer, target.user.username, { by });
	assert.equal(response.status, 403, `${by} for ${target.user.username}`);
	assert.equal(response.body.type, "USER_PRIVATE");
}

void describe("GET /users/:username/comparison", () => {
	void describe("games in common and exclusive ones", () => {
		for (const by of DIMENSIONS) {
			void it(`compares the ${by} games of both users`, async () => {
				const viewer = await createUserWithSession();
				const target = await createUserWithSession();
				const [shared, onlyViewer, onlyTarget] = await createGames(3);
				await seed(by, viewer, [shared!, onlyViewer!]);
				await seed(by, target, [shared!, onlyTarget!]);

				const byDefault = await compareOk(viewer, target, { by });
				const withViewer = await compareOk(viewer, target, {
					by,
					includeOnlyViewer: "true"
				});
				const withTarget = await compareOk(viewer, target, {
					by,
					includeOnlyTarget: "true"
				});
				const withBoth = await compareOk(viewer, target, {
					by,
					includeOnlyViewer: "true",
					includeOnlyTarget: "true"
				});

				assert.equal(byDefault.by, by);
				assert.deepEqual(idsOf(byDefault.inCommon), [shared!.id]);
				assert.deepEqual(byDefault.onlyViewer, []);
				assert.deepEqual(byDefault.onlyTarget, []);
				assert.deepEqual(byDefault.counts, {
					inCommon: 1,
					onlyViewer: 0,
					onlyTarget: 0
				});
				assert.deepEqual(idsOf(withViewer.onlyViewer), [
					onlyViewer!.id
				]);
				assert.deepEqual(withViewer.onlyTarget, []);
				assert.deepEqual(idsOf(withTarget.onlyTarget), [
					onlyTarget!.id
				]);
				assert.deepEqual(withTarget.onlyViewer, []);
				assert.deepEqual(withBoth.counts, {
					inCommon: 1,
					onlyViewer: 1,
					onlyTarget: 1
				});
				assert.deepEqual(withBoth.inCommon[0], {
					id: shared!.id,
					code: shared!.code,
					title: shared!.title,
					backgroundUrl: null
				});
			});
		}

		void it("defaults to the completed games", async () => {
			const viewer = await createUserWithSession();
			const target = await createUserWithSession();
			const [completedInCommon, playingInCommon] = await createGames(2);
			await seed("completed", viewer, [completedInCommon!]);
			await seed("completed", target, [completedInCommon!]);
			await seed("playing", viewer, [playingInCommon!]);
			await seed("playing", target, [playingInCommon!]);

			const body = await compareOk(viewer, target);

			assert.equal(body.by, "completed");
			assert.deepEqual(idsOf(body.inCommon), [completedInCommon!.id]);
		});

		void it("lists the whole target set as exclusive when the viewer has nothing", async () => {
			const viewer = await createUserWithSession();
			const target = await createUserWithSession();
			const games = await createGames(2);
			await seed("completed", target, games);

			const withoutExclusive = await compareOk(viewer, target);
			const withExclusive = await compareOk(viewer, target, {
				includeOnlyTarget: "true"
			});

			assert.deepEqual(withoutExclusive.counts, {
				inCommon: 0,
				onlyViewer: 0,
				onlyTarget: 0
			});
			assert.deepEqual(
				idsOf(withExclusive.onlyTarget),
				idsOfGames(games)
			);
			assert.equal(withExclusive.counts.onlyTarget, 2);
		});

		for (const by of ["completed", "shelf"] as const) {
			void it(`ignores the private ${by} entries of the target but keeps the private ones of the viewer`, async () => {
				const viewer = await createUserWithSession();
				const target = await createUserWithSession();
				const [shared, viewerPrivate, targetPrivate] =
					await createGames(3);
				await seed(by, viewer, [shared!, targetPrivate!]);
				await seed(by, viewer, [viewerPrivate!], false);
				await seed(by, target, [shared!, viewerPrivate!]);
				await seed(by, target, [targetPrivate!], false);

				const body = await compareOk(viewer, target, {
					by,
					includeOnlyViewer: "true",
					includeOnlyTarget: "true"
				});

				assert.deepEqual(
					idsOf(body.inCommon),
					idsOfGames([shared!, viewerPrivate!])
				);
				assert.deepEqual(idsOf(body.onlyViewer), [targetPrivate!.id]);
				assert.deepEqual(body.onlyTarget, []);
			});
		}

		void it("paginates every list while counting the whole set", async () => {
			const viewer = await createUserWithSession();
			const target = await createUserWithSession();
			const games = await createGames(3);
			await seed("completed", viewer, games);
			await seed("completed", target, games);

			const firstPage = await compareOk(viewer, target, { limit: 2 });
			const secondPage = await compareOk(viewer, target, {
				limit: 2,
				offset: 2
			});
			const fromOffset = await compareOk(viewer, target, { offset: 1 });

			assert.equal(firstPage.inCommon.length, 2);
			assert.equal(secondPage.inCommon.length, 1);
			assert.equal(fromOffset.inCommon.length, 2);
			for (const page of [firstPage, secondPage, fromOffset]) {
				assert.equal(page.counts.inCommon, 3);
			}
			assert.deepEqual(
				idsOf([...firstPage.inCommon, ...secondPage.inCommon]),
				idsOfGames(games)
			);
		});

		void it("answers an empty comparison when the viewer looks at their own profile", async () => {
			const viewer = await createUserWithSession();
			const [game] = await createGames(1);
			await seed("shelf", viewer, [game!]);

			const body = await compareOk(viewer, viewer, { by: "shelf" });

			assert.deepEqual(body, {
				by: "shelf",
				inCommon: [],
				onlyViewer: [],
				onlyTarget: [],
				counts: { inCommon: 0, onlyViewer: 0, onlyTarget: 0 }
			});
		});
	});

	void describe("profile visibility", () => {
		void it("closes a private profile to strangers, pending requesters and accepted or mutual followers", async () => {
			const target = await createUserWithSession();
			const stranger = await createUserWithSession();
			const pending = await createUserWithSession();
			const accepted = await createUserWithSession();
			const mutual = await createUserWithSession();
			await target.user.update({ profileVisibility: "private" });
			assert.equal(await follow(pending, target), "pending");
			for (const requester of [accepted, mutual]) {
				assert.equal(await follow(requester, target), "pending");
				await api()
					.post(
						`/users/me/follow-requests/${requester.user.id}/accept`
					)
					.set("Authorization", target.authorization)
					.expect(204);
			}
			await follow(target, mutual);

			for (const viewer of [stranger, pending, accepted, mutual]) {
				await expectPrivate(viewer, target, "completed");
			}
		});

		void it("opens a friends-only profile only to mutual followers", async () => {
			const target = await createUserWithSession();
			const stranger = await createUserWithSession();
			const oneWay = await createUserWithSession();
			const mutual = await createUserWithSession();
			await target.user.update({ profileVisibility: "friends" });
			await follow(oneWay, target);
			await becomeMutual(mutual, target);

			await expectPrivate(stranger, target, "completed");
			await expectPrivate(oneWay, target, "completed");
			assert.equal((await compareOk(mutual, target)).by, "completed");
		});
	});

	void describe("section visibility", () => {
		for (const { by, field, unaffectedBy } of SECTION_CASES) {
			void it(`hides ${by} behind ${field} without closing the other sections`, async () => {
				const viewer = await createUserWithSession();
				const target = await createUserWithSession();
				await target.user.update({ [field]: "private" });

				await expectPrivate(viewer, target, by);
				assert.equal(
					(await compareOk(viewer, target, { by: unaffectedBy })).by,
					unaffectedBy
				);
			});

			void it(`opens ${by} behind a friends-only ${field} to mutual followers only`, async () => {
				const target = await createUserWithSession();
				const oneWay = await createUserWithSession();
				const mutual = await createUserWithSession();
				await target.user.update({ [field]: "friends" });
				await follow(oneWay, target);
				await becomeMutual(mutual, target);

				await expectPrivate(oneWay, target, by);
				assert.equal((await compareOk(mutual, target, { by })).by, by);
			});
		}
	});

	void describe("errors", () => {
		void it("answers 404 USER_NOT_FOUND for a user that does not exist", async () => {
			const viewer = await createUserWithSession();

			const response = await compare(
				viewer,
				`ghost_${randomUUID().slice(0, 5)}`
			);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		});

		void it("rejects an unknown dimension, bad flags, bad pagination and unknown params with 422 COMMON_SCHEMA_INVALID", async () => {
			const viewer = await createUserWithSession();
			const target = await createUserWithSession();
			const invalidQueries: QueryParams[] = [
				{ by: "dropped" },
				{ includeOnlyTarget: "maybe" },
				{ includeOnlyViewer: "maybe" },
				{ limit: 0 },
				{ limit: 101 },
				{ limit: "many" },
				{ offset: -1 },
				{ page: 2 }
			];

			for (const query of invalidQueries) {
				const response = await compare(
					viewer,
					target.user.username,
					query
				);
				assert.equal(response.status, 422, JSON.stringify(query));
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			}
		});

		void it("rejects a request without a session with 422 AUTH_SCHEMA_INVALID", async () => {
			const target = await createUserWithSession();

			const response = await api().get(
				`/users/${target.user.username}/comparison`
			);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
		});

		void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
			const target = await createUserWithSession();

			const response = await api()
				.get(`/users/${target.user.username}/comparison`)
				.set("Authorization", bearer("not-a-token"));

			assert.equal(response.status, 401);
			assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
		});
	});
});
