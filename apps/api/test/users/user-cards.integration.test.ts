import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

import { Op } from "sequelize";

import { Backlog } from "../../src/backlog/backlog.model";
import { sequelize } from "../../src/database/sequelize.database";
import { Favorite } from "../../src/favorites/favorite.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { USER_CARD_ATTRS } from "../../src/users/constants/user-attrs.constants";
import { type VisibilityLevel } from "../../src/users/constants/visibility.constants";
import { User } from "../../src/users/user.model";
import { buildUserCards } from "../../src/users/user-cards.service";
import * as usersProfileService from "../../src/users/users-profile.service";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { truncateAllTables, useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface CardSetup {
	profile: VisibilityLevel;
	backlog: VisibilityLevel;
	favorite: VisibilityLevel;
	viewerFollows?: boolean;
	followsViewer?: boolean;
	backlogEntries?: { status: "completed" | "playing"; isPublic: boolean }[];
	favoritePositions?: number[];
}

type FeaturedGame = { title: string; backgroundUrl: string | null } | null;

type Viewer = "mutual" | "stranger" | "anonymous";

interface ExpectedCard {
	profileVisible: boolean;
	isFollowing: boolean;
	followerCount: number | null;
	gamesTotal: number | null;
	completedTotal: number | null;
	featuredGame: FeaturedGame;
}

const QUERY_COUNTER_HOOK = "countCardQueries";
const SESSION_QUERIES = 2;
const USER_LOOKUP_QUERIES = 1;
const CARD_QUERIES = 4;
const REQUEST_QUERY_BUDGET =
	SESSION_QUERIES + USER_LOOKUP_QUERIES + CARD_QUERIES;

function uniqueTag() {
	return randomUUID().replaceAll("-", "").slice(0, 6);
}

async function countQueries<T>(run: () => Promise<T>) {
	let count = 0;
	sequelize.addHook("beforeQuery", QUERY_COUNTER_HOOK, () => {
		count += 1;
	});
	try {
		const result = await run();
		return { result, count };
	} finally {
		sequelize.removeHook("beforeQuery", QUERY_COUNTER_HOOK);
	}
}

function withViewer(
	request: ReturnType<ReturnType<typeof api>["get"]>,
	viewer: Account | undefined
) {
	return viewer
		? request.set("Authorization", viewer.authorization)
		: request;
}

function search(viewer: Account | undefined, q: string, limit: number) {
	return withViewer(api().get("/users/search").query({ q, limit }), viewer);
}

function discover(viewer: Account | undefined, limit: number) {
	return withViewer(api().get("/users/discover").query({ limit }), viewer);
}

async function applyVisibility(user: User, setup: CardSetup) {
	await user.update({
		profileVisibility: setup.profile,
		backlogVisibility: setup.backlog,
		favoriteVisibility: setup.favorite
	});
}

async function seedCardData(
	user: User,
	viewer: User,
	platformId: string,
	setup: CardSetup
) {
	let featuredGame: FeaturedGame = null;
	let featuredPosition = Infinity;
	await applyVisibility(user, setup);
	if (setup.viewerFollows)
		await UserFollower.create({
			followerId: viewer.id,
			followingId: user.id
		});
	if (setup.followsViewer)
		await UserFollower.create({
			followerId: user.id,
			followingId: viewer.id
		});
	for (const entry of setup.backlogEntries ?? []) {
		const game = await createGame();
		await Backlog.create({
			userId: user.id,
			gameId: game.id,
			platformId,
			status: entry.status,
			score: 4,
			duration: 10,
			isPublic: entry.isPublic
		});
	}
	for (const position of setup.favoritePositions ?? []) {
		const game = await createGame();
		await Favorite.create({ userId: user.id, gameId: game.id, position });
		if (position < featuredPosition) {
			featuredGame = { title: game.title, backgroundUrl: null };
			featuredPosition = position;
		}
	}
	return featuredGame;
}

const FULL_CARD: CardSetup = {
	profile: "public",
	backlog: "public",
	favorite: "public",
	viewerFollows: true,
	backlogEntries: [
		{ status: "completed", isPublic: true },
		{ status: "playing", isPublic: false }
	],
	favoritePositions: [2, 1]
};

const MIXED_CARDS: CardSetup[] = [
	FULL_CARD,
	{
		profile: "friends",
		backlog: "friends",
		favorite: "friends",
		viewerFollows: true,
		followsViewer: true,
		backlogEntries: [{ status: "completed", isPublic: true }],
		favoritePositions: [1]
	},
	{
		profile: "friends",
		backlog: "public",
		favorite: "public",
		followsViewer: true,
		backlogEntries: [{ status: "playing", isPublic: true }]
	},
	{
		profile: "private",
		backlog: "public",
		favorite: "public",
		viewerFollows: true,
		followsViewer: true,
		favoritePositions: [1]
	},
	{
		profile: "public",
		backlog: "private",
		favorite: "friends",
		backlogEntries: [{ status: "completed", isPublic: true }],
		favoritePositions: [1]
	},
	{
		profile: "public",
		backlog: "friends",
		favorite: "private",
		viewerFollows: true,
		followsViewer: true
	}
];

async function seedNamedUsers(tag: string, viewer: User, setups: CardSetup[]) {
	const platform = await createPlatform();
	const featuredGames = new Map<string, FeaturedGame>();
	for (const [index, setup] of setups.entries()) {
		const username = `${tag}_${index}`;
		const user = await createUser({ username });
		featuredGames.set(
			username,
			await seedCardData(user, viewer, platform.id, setup)
		);
	}
	return featuredGames;
}

async function seedVariedCards() {
	const tag = `eq${uniqueTag()}`;
	const viewer = await createUserWithSession();
	const stranger = await createUserWithSession();
	await viewer.user.update({ username: `${tag}_self` });
	const platform = await createPlatform();
	const selfFeaturedGame = await seedCardData(
		viewer.user,
		viewer.user,
		platform.id,
		{
			profile: "private",
			backlog: "private",
			favorite: "private",
			backlogEntries: [
				{ status: "completed", isPublic: false },
				{ status: "playing", isPublic: true }
			],
			favoritePositions: [3, 1]
		}
	);
	const featuredGames = await seedNamedUsers(tag, viewer.user, [
		...MIXED_CARDS,
		{ profile: "public", backlog: "public", favorite: "public" },
		{
			profile: "friends",
			backlog: "friends",
			favorite: "friends",
			viewerFollows: true
		}
	]);
	featuredGames.set(viewer.user.username, selfFeaturedGame);
	await UserFollower.create({
		followerId: stranger.user.id,
		followingId: viewer.user.id
	});
	const users = await User.findAll({
		where: { username: { [Op.startsWith]: tag } },
		attributes: USER_CARD_ATTRS,
		order: [["username", "ASC"]]
	});
	const viewerIds: Record<Viewer, string | undefined> = {
		mutual: viewer.user.id,
		stranger: stranger.user.id,
		anonymous: undefined
	};
	return { tag, viewer, users, viewerIds, featuredGames };
}

function hiddenCard(isFollowing: boolean): ExpectedCard {
	return {
		profileVisible: false,
		isFollowing,
		followerCount: null,
		gamesTotal: null,
		completedTotal: null,
		featuredGame: null
	};
}

function visibleCard(
	isFollowing: boolean,
	followerCount: number,
	backlog: { gamesTotal: number; completedTotal: number } | null,
	featuredGame: FeaturedGame = null
): ExpectedCard {
	return {
		profileVisible: true,
		isFollowing,
		followerCount,
		gamesTotal: backlog?.gamesTotal ?? null,
		completedTotal: backlog?.completedTotal ?? null,
		featuredGame
	};
}

function expectedCards(
	viewer: Viewer,
	featured: (suffix: string) => FeaturedGame
): Record<string, ExpectedCard> {
	const isMutualViewer = viewer === "mutual";
	const publicCompleted = { gamesTotal: 1, completedTotal: 1 };
	const emptyBacklog = { gamesTotal: 0, completedTotal: 0 };
	return {
		"0": visibleCard(isMutualViewer, 1, publicCompleted, featured("0")),
		"1": isMutualViewer
			? visibleCard(true, 1, publicCompleted, featured("1"))
			: hiddenCard(false),
		"2": hiddenCard(false),
		"3": hiddenCard(isMutualViewer),
		"4": visibleCard(false, 0, null),
		"5": visibleCard(
			isMutualViewer,
			1,
			isMutualViewer ? emptyBacklog : null
		),
		"6": visibleCard(false, 0, emptyBacklog),
		"7": hiddenCard(isMutualViewer),
		self: isMutualViewer
			? visibleCard(
					false,
					5,
					{ gamesTotal: 2, completedTotal: 1 },
					featured("self")
				)
			: hiddenCard(viewer === "stranger")
	};
}

void describe("user cards query count", () => {
	void describe("GET /users/search", () => {
		let tag: string;
		let viewer: Account;
		let stranger: Account;

		before(async () => {
			tag = `cards_${uniqueTag()}`;
			viewer = await createUserWithSession();
			stranger = await createUserWithSession();
			await seedNamedUsers(tag, viewer.user, MIXED_CARDS);
		});

		for (const scenario of ["mutual", "stranger"] as const) {
			void it(`does not grow with the number of cards for a ${scenario} viewer`, async () => {
				const account = scenario === "mutual" ? viewer : stranger;

				const single = await countQueries(() =>
					search(account, tag, 1)
				);
				const many = await countQueries(() => search(account, tag, 6));

				assert.equal(single.result.status, 200);
				assert.equal(many.result.status, 200);
				assert.equal(single.result.body.data.users.length, 1);
				assert.equal(many.result.body.data.users.length, 6);
				assert.ok(single.count <= REQUEST_QUERY_BUDGET);
				assert.ok(many.count <= REQUEST_QUERY_BUDGET);
			});
		}
	});

	void describe("GET /users/discover", () => {
		let viewer: Account;
		let stranger: Account;

		before(async () => {
			await truncateAllTables();
			viewer = await createUserWithSession();
			stranger = await createUserWithSession();
			await viewer.user.update({ profileVisibility: "private" });
			await stranger.user.update({ profileVisibility: "private" });
			const publicCards = MIXED_CARDS.map(setup => ({
				...setup,
				profile: "public" as const
			}));
			await seedNamedUsers(
				`disc_${uniqueTag()}`,
				viewer.user,
				publicCards
			);
		});

		for (const scenario of ["mutual", "stranger", "anonymous"] as const) {
			void it(`does not grow with the number of cards for a ${scenario} viewer`, async () => {
				const account =
					scenario === "mutual"
						? viewer
						: scenario === "stranger"
							? stranger
							: undefined;

				const single = await countQueries(() => discover(account, 1));
				const many = await countQueries(() => discover(account, 6));

				assert.equal(single.result.status, 200);
				assert.equal(many.result.status, 200);
				assert.equal(single.result.body.data.users.length, 1);
				assert.equal(many.result.body.data.users.length, 6);
				assert.ok(single.count <= REQUEST_QUERY_BUDGET);
				assert.ok(many.count <= REQUEST_QUERY_BUDGET);
			});
		}
	});

	void describe("buildUserCards", () => {
		let seed: Awaited<ReturnType<typeof seedVariedCards>>;

		before(async () => {
			seed = await seedVariedCards();
		});

		for (const scenario of ["mutual", "stranger", "anonymous"] as const) {
			void it(`resolves visibility, follows, counts and favorites for a ${scenario} viewer`, async () => {
				const cards = await buildUserCards(
					seed.viewerIds[scenario],
					seed.users
				);

				const actual = Object.fromEntries(
					cards.map(card => [
						card.user.username.slice(seed.tag.length + 1),
						{
							profileVisible: card.profileVisible,
							isFollowing: card.isFollowing,
							followerCount: card.followerCount,
							gamesTotal: card.gamesTotal,
							completedTotal: card.completedTotal,
							featuredGame: card.featuredGame
						}
					])
				);
				const expected = expectedCards(
					scenario,
					suffix =>
						seed.featuredGames.get(`${seed.tag}_${suffix}`) ?? null
				);
				assert.deepEqual(actual, expected);
				assert.deepEqual(
					cards.map(card => card.isSelf),
					seed.users.map(user => user.id === seed.viewerIds[scenario])
				);
			});
		}

		void it("keeps the cards of an empty user list empty", async () => {
			const { result, count } = await countQueries(() =>
				buildUserCards(seed.viewer.user.id, [])
			);

			assert.deepEqual(result, []);
			assert.equal(count, 0);
		});
	});

	void describe("equivalence with the legacy buildUserCards", () => {
		let seed: Awaited<ReturnType<typeof seedVariedCards>>;

		before(async () => {
			seed = await seedVariedCards();
		});

		for (const scenario of ["mutual", "stranger", "anonymous"] as const) {
			void it(`matches the per-user cards for a ${scenario} viewer`, async () => {
				const viewerId = seed.viewerIds[scenario];

				const batched = await buildUserCards(viewerId, seed.users);
				const perUser = await usersProfileService.buildUserCards(
					viewerId,
					seed.users
				);

				assert.equal(seed.users.length, 9);
				assert.ok(batched.some(card => !card.profileVisible));
				assert.ok(batched.some(card => card.featuredGame !== null));
				assert.ok(batched.some(card => card.gamesTotal !== null));
				assert.deepEqual(batched, perUser);
			});
		}
	});
});
