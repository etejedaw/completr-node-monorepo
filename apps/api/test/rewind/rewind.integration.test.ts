import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { GameGenre } from "../../src/game-genre/game-genre.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { type Game } from "../../src/games/game.model";
import { Genre } from "../../src/genres/genres.model";
import { type Platform } from "../../src/platforms/platform.model";
import { UserFollower } from "../../src/user-followers/user-follower.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createUser
} from "../helpers/factories.helper";
import { storeRewind } from "./rewind-generation.helper";

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

interface RunFields {
	status: BacklogStatus;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	duration?: number;
	score?: number;
	userRating?: number;
	isPublic?: boolean;
	notes?: string;
	platform?: Platform;
}

interface Fixture {
	owner: Account;
	stranger: Account;
	follower: Account;
	mutual: Account;
	games: Record<"hades" | "celeste" | "tunic" | "outer" | "secret", Game>;
}

const SIGNED_UP_BEFORE_THE_DATA = new Date("2020-01-01T00:00:00.000Z");

let fixture: Fixture;
let playstation: Platform;
let nintendo: Platform;

function getAs(path: string, authorization?: string) {
	const request = api().get(path);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

function rewinds(username: string, authorization?: string) {
	return getAs(`/users/${username}/rewinds`, authorization);
}

function rewind(username: string, year: string, authorization?: string) {
	return getAs(`/users/${username}/rewinds/${year}`, authorization);
}

function addRun(userId: string, game: Game, fields: RunFields) {
	const { platform = playstation, ...rest } = fields;
	return Backlog.create({
		userId,
		gameId: game.id,
		platformId: platform.id,
		...rest
	});
}

async function backdateSignUp(user: User, createdAt: Date) {
	await User.update({ createdAt }, { where: { id: user.id }, silent: true });
	await user.reload();
}

async function makeMutual(first: User, second: User) {
	await UserFollower.bulkCreate([
		{ followerId: first.id, followingId: second.id },
		{ followerId: second.id, followingId: first.id }
	]);
}

async function createCoveredGame(title: string) {
	const game = await createGame({ title });
	return game.update({
		coverUrl: `https://img.test/${game.code}.jpg`,
		backgroundUrl: `https://img.test/${game.code}-bg.jpg`
	});
}

async function seedGenres(games: Fixture["games"]) {
	const [rpg, action] = await Promise.all([
		Genre.create({ name: "RPG", code: "rewind-rpg" }),
		Genre.create({ name: "Action", code: "rewind-action" })
	]);
	await GameGenre.bulkCreate([
		{ gameId: games.hades.id, genreId: action.id },
		{ gameId: games.hades.id, genreId: rpg.id },
		{ gameId: games.celeste.id, genreId: action.id },
		{ gameId: games.secret.id, genreId: rpg.id }
	]);
}

async function seedRuns(owner: User, games: Fixture["games"]) {
	await addRun(owner.id, games.hades, {
		status: "completed",
		startedAt: "2025-01-05",
		finishedAt: "2025-03-10",
		realDuration: 20,
		score: 4,
		userRating: 5,
		notes: "visible run notes"
	});
	await addRun(owner.id, games.celeste, {
		status: "completed",
		finishedAt: "2025-07-01",
		realDuration: 10,
		score: 4.5,
		userRating: 4,
		platform: nintendo
	});
	await addRun(owner.id, games.secret, {
		status: "completed",
		finishedAt: "2025-05-01",
		realDuration: 100,
		userRating: 5,
		isPublic: false,
		notes: "secret notes"
	});
	await addRun(owner.id, games.tunic, {
		status: "abandoned",
		finishedAt: "2025-08-01",
		realDuration: 5
	});
	await addRun(owner.id, games.outer, {
		status: "completed",
		finishedAt: "2024-11-11",
		realDuration: 15,
		userRating: 3
	});
	await addRun(owner.id, games.secret, {
		status: "abandoned",
		finishedAt: "2023-06-01",
		isPublic: false
	});
	await addRun(owner.id, games.tunic, { status: "playing" });
}

async function seedPlatinums(owner: User, games: Fixture["games"]) {
	await GamePlatinum.bulkCreate([
		{
			userId: owner.id,
			gameId: games.hades.id,
			platinumedAt: "2025-04-01"
		},
		{
			userId: owner.id,
			gameId: games.outer.id,
			platinumedAt: "2024-12-01"
		},
		{ userId: owner.id, gameId: games.celeste.id, platinumedAt: null }
	]);
}

async function withOwnerVisibility(
	levels: Partial<
		Pick<
			User,
			"profileVisibility" | "rewindVisibility" | "platinumVisibility"
		>
	>,
	check: () => Promise<void>
) {
	try {
		await fixture.owner.user.update(levels);
		await check();
	} finally {
		await fixture.owner.user.update({
			profileVisibility: "public",
			rewindVisibility: "public",
			platinumVisibility: "public"
		});
	}
}

async function storeRewinds(account: Account, years: number[]) {
	await Promise.all(years.map(year => storeRewind(account, year)));
}

async function seedFixture() {
	[playstation, nintendo] = await Promise.all([
		createPlatform(),
		createPlatform()
	]);
	await nintendo.update({ name: "A Nintendo Switch" });

	const [owner, stranger, follower, mutual] = await Promise.all([
		createUserWithSession(),
		createUserWithSession(),
		createUserWithSession(),
		createUserWithSession()
	]);
	await backdateSignUp(owner!.user, SIGNED_UP_BEFORE_THE_DATA);
	await UserFollower.create({
		followerId: follower!.user.id,
		followingId: owner!.user.id
	});
	await makeMutual(owner!.user, mutual!.user);

	const games = {
		hades: await createCoveredGame("Hades"),
		celeste: await createCoveredGame("Celeste"),
		tunic: await createCoveredGame("Tunic"),
		outer: await createCoveredGame("Outer Wilds"),
		secret: await createCoveredGame("Secret Game")
	};
	await seedGenres(games);
	await seedRuns(owner!.user, games);
	await seedPlatinums(owner!.user, games);
	await storeRewinds(owner!, [2025, 2024, 2023]);

	fixture = {
		owner: owner!,
		stranger: stranger!,
		follower: follower!,
		mutual: mutual!,
		games
	};
}

useTestDatabase(seedFixture);

void describe("GET /users/:username/rewinds", () => {
	void it("lists every year with data for the owner, newest first", async () => {
		const { owner } = fixture;

		const response = await rewinds(
			owner.user.username,
			owner.authorization
		).expect(200);

		assert.equal(response.body.data.spotlightYear, null);
		assert.deepEqual(
			response.body.data.years.map((year: { year: number }) => year.year),
			[2025, 2024, 2023]
		);
		const [latest] = response.body.data.years;
		assert.equal(latest.finishedCount, 3);
		assert.equal(latest.startedCount, 1);
		assert.equal(latest.hoursPlayed, 135);
		assert.equal(latest.persona, "marathoner");
	});

	void it("builds the years of everyone else from public runs only", async () => {
		const { owner, games } = fixture;

		const response = await rewinds(owner.user.username).expect(200);

		const years = response.body.data.years;
		assert.deepEqual(
			years.map((year: { year: number }) => year.year),
			[2025, 2024]
		);
		assert.equal(years[0].finishedCount, 2);
		assert.equal(years[0].hoursPlayed, 35);
		assert.equal(years[0].persona, "steady-player");
		assert.deepEqual(years[0].covers, [
			{
				gameId: games.hades.id,
				code: games.hades.code,
				title: "Hades",
				coverUrl: `https://img.test/${games.hades.code}.jpg`,
				backgroundUrl: `https://img.test/${games.hades.code}-bg.jpg`
			},
			{
				gameId: games.celeste.id,
				code: games.celeste.code,
				title: "Celeste",
				coverUrl: `https://img.test/${games.celeste.code}.jpg`,
				backgroundUrl: `https://img.test/${games.celeste.code}-bg.jpg`
			}
		]);
		assert.equal(JSON.stringify(response.body).includes("Secret"), false);
	});

	void it("answers an empty list for a user without dated runs", async () => {
		const quiet = await createUserWithSession();

		const response = await rewinds(quiet.user.username).expect(200);

		assert.deepEqual(response.body.data, {
			spotlightYear: null,
			years: []
		});
	});

	void it("answers 404 USER_NOT_FOUND for a missing or inactive user", async () => {
		const inactive = await createUser({ isActive: false });

		for (const username of ["nobody-here", inactive.username]) {
			const response = await rewinds(username);
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "USER_NOT_FOUND");
		}
	});
});

void describe("GET /users/:username/rewinds/:year", () => {
	void it("returns the full Rewind with private runs to the owner", async () => {
		const { owner, games } = fixture;

		const response = await rewind(
			owner.user.username,
			"2025",
			owner.authorization
		).expect(200);

		const data = response.body.data;
		assert.equal(data.year, 2025);
		assert.equal(data.isSpotlight, false);
		assert.deepEqual(data.otherYears, [2024, 2023]);
		assert.deepEqual(data.user, {
			username: owner.user.username,
			name: owner.user.name,
			avatarUrl: null,
			role: "user"
		});
		assert.equal(data.persona, "marathoner");
		assert.deepEqual(data.totals, {
			finished: 3,
			abandoned: 1,
			started: 1,
			hoursPlayed: 135,
			platinums: 1,
			finishRate: 75,
			averageRating: 4.7,
			genresPlayed: 2,
			platformsPlayed: 2
		});
		assert.deepEqual(
			data.finishedGames.map((game: { code: string }) => game.code),
			[games.hades.code, games.secret.code, games.celeste.code]
		);
		assert.equal(data.highlights.topRated.code, games.secret.code);
		assert.equal(data.highlights.longest.code, games.secret.code);
		assert.equal(data.highlights.fastest.code, games.celeste.code);
		assert.deepEqual(data.highlights.favoriteGenre, {
			code: "rewind-action",
			name: "Action",
			count: 2
		});
		assert.deepEqual(data.highlights.busiestMonth, { month: 3, count: 1 });
		assert.equal(data.highlights.firstFinished.code, games.hades.code);
		assert.equal(data.highlights.lastFinished.code, games.celeste.code);
		assert.deepEqual(data.highlights.topGenres, [
			{ code: "rewind-action", name: "Action", count: 2 },
			{ code: "rewind-rpg", name: "RPG", count: 2 }
		]);
		assert.deepEqual(
			data.highlights.topPlatforms.map(
				(platform: { count: number }) => platform.count
			),
			[2, 1]
		);
		assert.equal(data.highlights.longestStreak, null);
		assert.equal(JSON.stringify(response.body).includes("notes"), false);
	});

	void it("leaves private runs out for visitors and never sends notes", async () => {
		const { owner, stranger, games } = fixture;

		for (const authorization of [undefined, stranger.authorization]) {
			const response = await rewind(
				owner.user.username,
				"2025",
				authorization
			).expect(200);

			const data = response.body.data;
			assert.deepEqual(data.otherYears, [2024]);
			assert.deepEqual(data.totals, {
				finished: 2,
				abandoned: 1,
				started: 1,
				hoursPlayed: 35,
				platinums: 1,
				finishRate: 67,
				averageRating: 4.5,
				genresPlayed: 2,
				platformsPlayed: 2
			});
			assert.equal(data.persona, "steady-player");
			assert.deepEqual(data.highlights.topGenres, [
				{ code: "rewind-action", name: "Action", count: 2 },
				{ code: "rewind-rpg", name: "RPG", count: 1 }
			]);
			assert.equal(data.highlights.topRated.code, games.hades.code);
			assert.equal(data.highlights.topRated.userRating, 5);
			assert.equal(data.highlights.longest.code, games.hades.code);
			assert.equal(data.highlights.longest.hours, 20);
			assert.equal(data.highlights.fastest.code, games.celeste.code);
			assert.equal(data.highlights.bestRatio.code, games.celeste.code);
			assert.equal(data.highlights.bestRatio.personalRatio, 9);
			assert.deepEqual(data.highlights.topPlatform, {
				name: "A Nintendo Switch",
				abbreviation: nintendo.abbreviation,
				count: 1
			});
			assert.deepEqual(data.highlights.favoriteGenre, {
				code: "rewind-action",
				name: "Action",
				count: 2
			});
			const body = JSON.stringify(response.body);
			assert.equal(body.includes("Secret"), false);
			assert.equal(body.includes("notes"), false);
		}
	});

	void it("hides the platinum total from viewers without platinum access", async () => {
		const { owner, stranger, follower, mutual } = fixture;

		await withOwnerVisibility(
			{ platinumVisibility: "friends" },
			async () => {
				const platinumsFor = async (authorization?: string) =>
					(
						await rewind(
							owner.user.username,
							"2025",
							authorization
						).expect(200)
					).body.data.totals.platinums;

				assert.equal(await platinumsFor(), null);
				assert.equal(await platinumsFor(stranger.authorization), null);
				assert.equal(await platinumsFor(follower.authorization), null);
				assert.equal(await platinumsFor(mutual.authorization), 1);
				assert.equal(await platinumsFor(owner.authorization), 1);
			}
		);
	});

	void it("counts only platinums dated in the year", async () => {
		const { owner } = fixture;

		const response = await rewind(owner.user.username, "2024").expect(200);

		assert.equal(response.body.data.totals.platinums, 1);
		assert.equal(response.body.data.totals.finished, 1);
	});

	void it("answers 404 REWIND_NOT_FOUND for years without data or still closed", async () => {
		const { owner } = fixture;
		const nextYear = String(new Date().getUTCFullYear() + 1);

		for (const year of ["2022", "2000", "2100", nextYear]) {
			const response = await rewind(
				owner.user.username,
				year,
				owner.authorization
			);
			assert.equal(response.status, 404, `year ${year}`);
			assert.equal(response.body.type, "REWIND_NOT_FOUND");
		}
	});

	void it("answers 404 to visitors for a year that only has private runs", async () => {
		const { owner, mutual } = fixture;

		const visitor = await rewind(
			owner.user.username,
			"2023",
			mutual.authorization
		);
		assert.equal(visitor.status, 404);
		assert.equal(visitor.body.type, "REWIND_NOT_FOUND");

		const own = await rewind(
			owner.user.username,
			"2023",
			owner.authorization
		).expect(200);
		assert.equal(own.body.data.totals.abandoned, 1);
		assert.equal(own.body.data.totals.hoursPlayed, 0);
		assert.deepEqual(own.body.data.finishedGames, []);
		assert.equal(own.body.data.highlights.topRated, null);
		assert.equal(own.body.data.highlights.busiestMonth, null);
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for garbage years", async () => {
		const { owner } = fixture;

		for (const year of [
			"abc",
			"1999",
			"2101",
			"2025.5",
			"-2025",
			"0x7E9"
		]) {
			const response = await rewind(owner.user.username, year);
			assert.equal(response.status, 422, `year ${year}`);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
	});

	void it("answers 404 USER_NOT_FOUND for a missing user", async () => {
		const response = await rewind("nobody-here", "2025");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});

	void it("treats a garbage token as an anonymous visitor", async () => {
		const { owner } = fixture;

		const response = await rewind(
			owner.user.username,
			"2025",
			"Bearer not-a-token"
		).expect(200);

		assert.equal(response.body.data.totals.finished, 2);
	});

	void it("answers repeated and interleaved requests consistently", async () => {
		const { owner } = fixture;
		const years = ["2025", "2024", "2025", "2024", "2025"];

		const responses = await Promise.all(
			years.map(year => rewind(owner.user.username, year))
		);

		responses.forEach((response, index) => {
			assert.equal(response.status, 200);
			assert.equal(response.body.data.year, Number(years[index]));
		});
		assert.deepEqual(responses[0]!.body, responses[2]!.body);
		assert.deepEqual(responses[1]!.body, responses[3]!.body);
	});
});

void describe("rewind years and the sign-up date", () => {
	async function createImporterSignedUpIn2024() {
		const importer = await createUserWithSession();
		await backdateSignUp(
			importer.user,
			new Date("2024-06-01T12:00:00.000Z")
		);
		const { games } = fixture;
		await addRun(importer.user.id, games.hades, {
			status: "completed",
			startedAt: "2022-01-01",
			finishedAt: "2023-03-03",
			realDuration: 12
		});
		await addRun(importer.user.id, games.celeste, {
			status: "completed",
			finishedAt: "2024-02-02",
			realDuration: 8
		});
		await addRun(importer.user.id, games.tunic, {
			status: "abandoned",
			finishedAt: "2025-05-05"
		});
		await storeRewinds(importer, [2025, 2024, 2023]);
		return importer;
	}

	void it("leaves the years before the sign-up out of the list and otherYears", async () => {
		const importer = await createImporterSignedUpIn2024();

		for (const authorization of [undefined, importer.authorization]) {
			const list = await rewinds(
				importer.user.username,
				authorization
			).expect(200);
			assert.deepEqual(
				list.body.data.years.map((year: { year: number }) => year.year),
				[2025, 2024]
			);

			const detail = await rewind(
				importer.user.username,
				"2025",
				authorization
			).expect(200);
			assert.deepEqual(detail.body.data.otherYears, [2024]);
		}
	});

	void it("answers 404 REWIND_NOT_FOUND for a year before the sign-up, even to the owner", async () => {
		const importer = await createImporterSignedUpIn2024();

		for (const year of ["2023", "2022", "2000"]) {
			const response = await rewind(
				importer.user.username,
				year,
				importer.authorization
			);
			assert.equal(response.status, 404, `year ${year}`);
			assert.equal(response.body.type, "REWIND_NOT_FOUND");
		}
		const signUpYear = await rewind(
			importer.user.username,
			"2024",
			importer.authorization
		).expect(200);
		assert.equal(signUpYear.body.data.totals.finished, 1);
	});

	void it("answers an empty list to an account that only has imported years", async () => {
		const newcomer = await createUserWithSession();
		await addRun(newcomer.user.id, fixture.games.outer, {
			status: "completed",
			finishedAt: "2025-01-01"
		});
		await storeRewinds(newcomer, [2025]);

		const response = await rewinds(newcomer.user.username).expect(200);

		assert.deepEqual(response.body.data, {
			spotlightYear: null,
			years: []
		});
		const detail = await rewind(newcomer.user.username, "2025");
		assert.equal(detail.status, 404);
		assert.equal(detail.body.type, "REWIND_NOT_FOUND");
	});
});

void describe("rewind visibility", () => {
	const endpoints = [
		(username: string, authorization?: string) =>
			rewinds(username, authorization),
		(username: string, authorization?: string) =>
			rewind(username, "2025", authorization)
	];

	void it("follows rewindVisibility on both endpoints", async () => {
		const { owner, stranger, follower, mutual } = fixture;

		for (const request of endpoints) {
			const statusFor = async (authorization?: string) =>
				(await request(owner.user.username, authorization)).status;

			await withOwnerVisibility(
				{ rewindVisibility: "friends" },
				async () => {
					assert.equal(await statusFor(), 403);
					assert.equal(await statusFor(stranger.authorization), 403);
					assert.equal(await statusFor(follower.authorization), 403);
					assert.equal(await statusFor(mutual.authorization), 200);
					assert.equal(await statusFor(owner.authorization), 200);
				}
			);

			await withOwnerVisibility(
				{ rewindVisibility: "private" },
				async () => {
					const hidden = await request(
						owner.user.username,
						mutual.authorization
					);
					assert.equal(hidden.status, 403);
					assert.equal(hidden.body.type, "USER_PRIVATE");
					assert.equal(await statusFor(owner.authorization), 200);
				}
			);
		}
	});

	void it("requires the profile to be visible too", async () => {
		const { owner, mutual } = fixture;

		await withOwnerVisibility(
			{ profileVisibility: "private" },
			async () => {
				for (const request of endpoints) {
					const anonymous = await request(owner.user.username);
					assert.equal(anonymous.status, 403);
					assert.equal(anonymous.body.type, "USER_PRIVATE");
					assert.equal(
						(
							await request(
								owner.user.username,
								mutual.authorization
							)
						).status,
						403
					);
					assert.equal(
						(
							await request(
								owner.user.username,
								owner.authorization
							)
						).status,
						200
					);
				}
			}
		);
	});

	void it("is saved with PATCH /users/me and exposed in the profile access", async () => {
		const account = await createUserWithSession();

		await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ rewindVisibility: "private" })
			.expect(200);
		const me = await api()
			.get("/users/me")
			.set("Authorization", account.authorization)
			.expect(200);
		const profile = await api()
			.get(`/users/${account.user.username}`)
			.expect(200);

		assert.equal(me.body.data.user.rewindVisibility, "private");
		assert.equal(profile.body.data.access.rewind, false);
	});

	void it("starts public for a new account", async () => {
		const account = await createUserWithSession();

		const profile = await api()
			.get(`/users/${account.user.username}`)
			.expect(200);

		assert.equal(profile.body.data.access.rewind, true);
	});

	void it("answers 422 COMMON_SCHEMA_INVALID for an unknown level", async () => {
		const account = await createUserWithSession();

		const response = await api()
			.patch("/users/me")
			.set("Authorization", account.authorization)
			.send({ rewindVisibility: "everyone" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
