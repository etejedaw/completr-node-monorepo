import { type Transaction } from "sequelize";
import z from "zod";

import { PasswordPolicySchema, UsernameSchema } from "../src/auth/schemas";
import * as passwordService from "../src/auth/services/password.service";
import { Backlog, type BacklogStatus } from "../src/backlog/backlog.model";
import { databaseConfig } from "../src/common/config/database.config";
import { environmentConfig } from "../src/common/config/environment.config";
import { PinoLogger } from "../src/common/logger/pino.logger";
import { titleToSlug } from "../src/common/utils/title-to-slug.util";
import { initDatabase } from "../src/database/init.database";
import { sequelize } from "../src/database/sequelize.database";
import { GamePlatform } from "../src/game-platform/game-platform.model";
import { GameScore } from "../src/game-scores/game-score.model";
import { GameTime, type TimeSource } from "../src/game-times/game-time.model";
import { Game } from "../src/games/game.model";
import { Platform } from "../src/platforms/platform.model";
import { ScoreSource } from "../src/score-sources/score-source.model";
import { User } from "../src/users/user.model";
import { type UserRole } from "../src/users/user-role.type";

const logger = new PinoLogger("seed-dev");

const LOCAL_DATABASE_HOSTS = ["127.0.0.1", "localhost", "::1"];

const SEED_PASSWORD = "DevSeed123!";

interface SeedUser {
	email: string;
	username: string;
	name: string;
	role: UserRole;
}

interface SeedPlatform {
	code: string;
	name: string;
	abbreviation: string;
	manufacturer: string;
	generation?: number;
}

interface SeedScoreSource {
	code: string;
	name: string;
	scale: number;
	priority: number;
}

interface SeedGame {
	title: string;
	releaseAt: string;
	platformCodes: string[];
	scores: Record<string, number>;
	durations: Partial<Record<TimeSource, number>>;
}

interface SeedBacklogEntry {
	gameTitle: string;
	platformCode: string;
	status: BacklogStatus;
	score: number;
	duration: number;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	userRating?: number;
}

const SEED_USERS: SeedUser[] = [
	{
		email: "admin@completr.local",
		username: "admin",
		name: "Admin Seed",
		role: "admin"
	},
	{
		email: "user@completr.local",
		username: "player",
		name: "Player Seed",
		role: "user"
	}
];

const BACKLOG_OWNER_EMAIL = "user@completr.local";

const SEED_PLATFORMS: SeedPlatform[] = [
	{
		code: "pc",
		name: "PC",
		abbreviation: "PC",
		manufacturer: "Generic"
	},
	{
		code: "playstation-5",
		name: "PlayStation 5",
		abbreviation: "PS5",
		manufacturer: "Sony",
		generation: 9
	},
	{
		code: "nintendo-switch",
		name: "Nintendo Switch",
		abbreviation: "NSW",
		manufacturer: "Nintendo",
		generation: 8
	},
	{
		code: "xbox-series-xors",
		name: "Xbox Series X|S",
		abbreviation: "XSX",
		manufacturer: "Microsoft",
		generation: 9
	}
];

const SEED_SCORE_SOURCES: SeedScoreSource[] = [
	{ code: "completr", name: "Completr", scale: 5, priority: 1 },
	{ code: "metacritic", name: "Metacritic", scale: 100, priority: 2 },
	{ code: "opencritic", name: "OpenCritic", scale: 100, priority: 3 },
	{ code: "rawg", name: "RAWG", scale: 5, priority: 4 }
];

const SEED_GAMES: SeedGame[] = [
	{
		title: "Astro Bot",
		releaseAt: "2024-09-06",
		platformCodes: ["playstation-5"],
		scores: { metacritic: 94, opencritic: 93 },
		durations: { hltb: 12 }
	},
	{
		title: "Hades",
		releaseAt: "2020-09-17",
		platformCodes: [
			"pc",
			"playstation-5",
			"nintendo-switch",
			"xbox-series-xors"
		],
		scores: { metacritic: 93, opencritic: 92, rawg: 4.4 },
		durations: { hltb: 22, rawg: 20 }
	},
	{
		title: "Balatro",
		releaseAt: "2024-02-20",
		platformCodes: ["pc"],
		scores: {},
		durations: { hltb: 25 }
	},
	{
		title: "Celeste",
		releaseAt: "2018-01-25",
		platformCodes: ["nintendo-switch"],
		scores: { metacritic: 92, opencritic: 91 },
		durations: {}
	},
	{
		title: "Tunic",
		releaseAt: "2022-03-16",
		platformCodes: ["xbox-series-xors"],
		scores: {},
		durations: {}
	},
	{
		title: "Hollow Knight",
		releaseAt: "2017-02-24",
		platformCodes: [],
		scores: { metacritic: 87, rawg: 4.5 },
		durations: { hltb: 27, rawg: 25 }
	}
];

const SEED_BACKLOG_ENTRIES: SeedBacklogEntry[] = [
	{
		gameTitle: "Hades",
		platformCode: "playstation-5",
		status: "playing",
		score: 4.65,
		duration: 22,
		startedAt: "2026-10-01"
	},
	{
		gameTitle: "Astro Bot",
		platformCode: "playstation-5",
		status: "completed",
		score: 4.7,
		duration: 12,
		startedAt: "2026-09-10",
		finishedAt: "2026-09-20",
		realDuration: 13.5,
		userRating: 4.5
	},
	{
		gameTitle: "Celeste",
		platformCode: "nintendo-switch",
		status: "not_started",
		score: 4.6,
		duration: 8.5
	}
];

function assertDevelopmentEnvironment() {
	if (environmentConfig.NODE_ENV !== "dev") {
		throw new Error(
			`Refusing to seed: NODE_ENV is "${environmentConfig.NODE_ENV}", expected "dev"`
		);
	}
	if (!LOCAL_DATABASE_HOSTS.includes(databaseConfig.PG_HOST)) {
		throw new Error(
			`Refusing to seed: PG_HOST "${databaseConfig.PG_HOST}" is not a local database`
		);
	}
}

function assertSeedCredentialsAreValid() {
	PasswordPolicySchema.parse(SEED_PASSWORD);
	for (const seedUser of SEED_USERS) {
		z.email().parse(seedUser.email);
		UsernameSchema.parse(seedUser.username);
	}
}

function mapByKey<T>(items: T[], key: (item: T) => string) {
	return new Map(items.map(item => [key(item), item]));
}

async function findOrCreateEach<Item, Instance>(
	items: Item[],
	findOrCreateOne: (item: Item) => Promise<[Instance, boolean]>
) {
	const instances: Instance[] = [];
	for (const item of items) {
		const [instance] = await findOrCreateOne(item);
		instances.push(instance);
	}
	return instances;
}

function requireEntry<T>(entries: Map<string, T>, key: string) {
	const entry = entries.get(key);
	if (!entry) {
		throw new Error(`Seed data references unknown entry "${key}"`);
	}
	return entry;
}

async function seedUsers(transaction: Transaction) {
	const password = await passwordService.hashPassword(SEED_PASSWORD);
	const users = await findOrCreateEach(SEED_USERS, seedUser =>
		User.findOrCreate({
			where: { email: seedUser.email },
			defaults: { ...seedUser, password },
			transaction
		})
	);
	return mapByKey(users, user => user.email);
}

async function seedPlatforms(transaction: Transaction) {
	const platforms = await findOrCreateEach(SEED_PLATFORMS, seedPlatform =>
		Platform.findOrCreate({
			where: { code: seedPlatform.code },
			defaults: { ...seedPlatform },
			transaction
		})
	);
	return mapByKey(platforms, platform => platform.code);
}

async function seedScoreSources(transaction: Transaction) {
	await findOrCreateEach(SEED_SCORE_SOURCES, seedScoreSource =>
		ScoreSource.findOrCreate({
			where: { code: seedScoreSource.code },
			defaults: { ...seedScoreSource },
			transaction
		})
	);
}

async function seedGameScores(
	game: Game,
	scores: SeedGame["scores"],
	transaction: Transaction
) {
	await findOrCreateEach(Object.entries(scores), ([source, score]) =>
		GameScore.findOrCreate({
			where: { gameId: game.id, source },
			defaults: { score },
			transaction
		})
	);
}

async function seedGameTimes(
	game: Game,
	durations: SeedGame["durations"],
	transaction: Transaction
) {
	await findOrCreateEach(Object.entries(durations), ([source, duration]) =>
		GameTime.findOrCreate({
			where: { gameId: game.id, source },
			defaults: { duration },
			transaction
		})
	);
}

async function seedGamePlatforms(
	game: Game,
	platformCodes: string[],
	platforms: Map<string, Platform>,
	transaction: Transaction
) {
	await findOrCreateEach(platformCodes, platformCode =>
		GamePlatform.findOrCreate({
			where: {
				gameId: game.id,
				platformId: requireEntry(platforms, platformCode).id
			},
			transaction
		})
	);
}

async function seedGame(
	seedGame: SeedGame,
	platforms: Map<string, Platform>,
	transaction: Transaction
) {
	const [game] = await Game.findOrCreate({
		where: { code: titleToSlug(seedGame.title) },
		defaults: { title: seedGame.title, releaseAt: seedGame.releaseAt },
		transaction
	});
	await seedGameScores(game, seedGame.scores, transaction);
	await seedGameTimes(game, seedGame.durations, transaction);
	await seedGamePlatforms(
		game,
		seedGame.platformCodes,
		platforms,
		transaction
	);
	return game;
}

async function seedGames(
	platforms: Map<string, Platform>,
	transaction: Transaction
) {
	const games: Game[] = [];
	for (const seedGameEntry of SEED_GAMES) {
		games.push(await seedGame(seedGameEntry, platforms, transaction));
	}
	return mapByKey(games, game => game.title);
}

async function seedBacklog(
	owner: User,
	games: Map<string, Game>,
	platforms: Map<string, Platform>,
	transaction: Transaction
) {
	for (const { gameTitle, platformCode, ...entry } of SEED_BACKLOG_ENTRIES) {
		const game = requireEntry(games, gameTitle);
		const platform = requireEntry(platforms, platformCode);
		await Backlog.findOrCreate({
			where: {
				userId: owner.id,
				gameId: game.id,
				platformId: platform.id
			},
			defaults: entry,
			transaction
		});
	}
}

async function seed() {
	await sequelize.transaction(async transaction => {
		const users = await seedUsers(transaction);
		const platforms = await seedPlatforms(transaction);
		await seedScoreSources(transaction);
		const games = await seedGames(platforms, transaction);
		await seedBacklog(
			requireEntry(users, BACKLOG_OWNER_EMAIL),
			games,
			platforms,
			transaction
		);
	});
}

async function main() {
	assertDevelopmentEnvironment();
	assertSeedCredentialsAreValid();

	await initDatabase();
	await seed();

	logger.info("seed", "ok", {
		users: SEED_USERS.map(({ email, role }) => ({ email, role })),
		password: SEED_PASSWORD,
		games: SEED_GAMES.map(({ title }) => title)
	});
}

void main()
	.catch(error => {
		console.error(
			`seed-dev failed: ${error instanceof Error ? error.message : String(error)}`
		);
		process.exitCode = 1;
	})
	.finally(() => sequelize.close());
