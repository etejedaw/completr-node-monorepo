import { randomUUID } from "node:crypto";

import { hashPassword } from "../../src/auth/services/password.service";
import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameShelf } from "../../src/game-shelf/game-shelf.model";
import {
	GameTime,
	type TimeSource
} from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { List } from "../../src/lists/list.model";
import { Platform } from "../../src/platforms/platform.model";
import { ScoreSource } from "../../src/score-sources/score-source.model";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";

export const DEFAULT_PASSWORD = "Passw0rd!";

let defaultPasswordHash: Promise<string> | undefined;

function uniqueSuffix() {
	return randomUUID().replaceAll("-", "").slice(0, 10);
}

function hashedDefaultPassword() {
	defaultPasswordHash ??= hashPassword(DEFAULT_PASSWORD);
	return defaultPasswordHash;
}

interface UserOverrides {
	role?: UserRole;
	username?: string;
	email?: string;
	password?: string;
	isActive?: boolean;
}

export async function createUser(overrides: UserOverrides = {}) {
	const suffix = uniqueSuffix();
	const password = overrides.password
		? await hashPassword(overrides.password)
		: await hashedDefaultPassword();

	return User.create({
		username: overrides.username ?? `u_${suffix}`,
		email: overrides.email ?? `user_${suffix}@completr.test`,
		password,
		name: `User ${suffix}`,
		role: overrides.role ?? "user",
		isActive: overrides.isActive ?? true
	});
}

export function createPlatform() {
	const suffix = uniqueSuffix();
	return Platform.create({
		name: `Platform ${suffix}`,
		code: `platform-${suffix}`,
		abbreviation: suffix.slice(0, 10).toUpperCase(),
		manufacturer: "Completr Test"
	});
}

export function createGame(
	overrides: { title?: string; isActive?: boolean } = {}
) {
	const suffix = uniqueSuffix();
	const title = overrides.title ?? `Game ${suffix}`;
	return Game.create({
		title,
		code: `game-${suffix}`,
		isActive: overrides.isActive ?? true
	});
}

export function createScoreSource(
	overrides: { code?: string; scale?: number; priority?: number } = {}
) {
	return ScoreSource.create({
		code: overrides.code ?? `source-${uniqueSuffix()}`,
		name: "Test Source",
		scale: overrides.scale ?? 100,
		priority: overrides.priority ?? 100
	});
}

export function createGameScore(gameId: string, source: string, score: number) {
	return GameScore.create({ gameId, source, score });
}

export function createGameTime(
	gameId: string,
	source: TimeSource,
	duration: number
) {
	return GameTime.create({ gameId, source, duration });
}

export function createList(
	userId: string,
	scoreSource: string,
	overrides: { name?: string; isPublic?: boolean } = {}
) {
	return List.create({
		userId,
		name: overrides.name ?? `List ${uniqueSuffix()}`,
		isPublic: overrides.isPublic ?? false,
		scoreSource,
		durationSource: "hltb"
	});
}

export function createBacklog(
	userId: string,
	gameId: string,
	platformId: string,
	overrides: {
		status?: BacklogStatus;
		score?: number;
		duration?: number;
	} = {}
) {
	return Backlog.create({
		userId,
		gameId,
		platformId,
		status: overrides.status ?? "not_started",
		score: overrides.score ?? 4,
		duration: overrides.duration ?? 10
	});
}

export function createShelfEntries(
	userId: string,
	gameId: string,
	platformId: string,
	count: number
) {
	return GameShelf.bulkCreate(
		Array.from({ length: count }, () => ({ userId, gameId, platformId }))
	);
}
