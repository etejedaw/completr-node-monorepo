import { mock } from "node:test";

import { Backlog, type BacklogStatus } from "../../src/backlog/backlog.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import {
	type GenerateRewindRequest,
	type RewindAiRecap,
	type RewindPremiumStats
} from "../../src/rewind/rewind.interface";
import { Rewind } from "../../src/rewind/rewind.model";
import * as rewindRecapService from "../../src/rewind-recap/rewind-recap.service";
import * as premiumStatsUtil from "../../src/rewind-recap/utils/build-rewind-premium-stats.util";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";

export type Account = Awaited<ReturnType<typeof createUserWithSession>>;

export const AI_RECAP: RewindAiRecap = {
	headline: "A year of long nights",
	summary: "You finished what you started.",
	insights: [
		{
			kind: "finish-discipline",
			title: "Closer",
			body: "Most runs reached the credits."
		}
	],
	funFact: "Your busiest month was March.",
	nextYearChallenge: "Try a genre you skipped."
};

export const PREMIUM_STATS: RewindPremiumStats = {
	hoursByMonth: [{ month: 3, hours: 10 }],
	tasteVsCritics: [],
	backlogFlow: [{ month: 3, added: 1, finished: 1 }],
	genreShare: []
};

export const FIRST_GENERATION: GenerateRewindRequest = {
	language: "en",
	includePrivateRuns: false,
	expectedGeneratedAt: null
};

export async function signUpOn(
	createdAt: string,
	role: UserRole = "user"
): Promise<Account> {
	const account = await createUserWithSession(role);
	await User.update(
		{ createdAt: new Date(createdAt) },
		{ where: { id: account.user.id }, silent: true }
	);
	await account.user.reload();
	return account;
}

export interface RunFields {
	status?: BacklogStatus;
	startedAt?: string;
	finishedAt?: string;
	realDuration?: number;
	isPublic?: boolean;
}

export function addRun(
	account: Account,
	game: Game,
	platform: Platform,
	fields: RunFields
) {
	return Backlog.create({
		userId: account.user.id,
		gameId: game.id,
		platformId: platform.id,
		status: "completed",
		realDuration: 10,
		...fields
	});
}

export function generate(
	account: Account,
	year: number | string,
	body: unknown = FIRST_GENERATION
) {
	return api()
		.post(`/users/me/rewinds/${year}`)
		.set("Authorization", account.authorization)
		.send(body as object);
}

export function requestAiRecap(account: Account, year: number | string) {
	return api()
		.post(`/users/me/rewinds/${year}/ai-recap`)
		.set("Authorization", account.authorization);
}

export function readRewind(
	username: string,
	year: number | string,
	authorization?: string
) {
	const request = api().get(`/users/${username}/rewinds/${year}`);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

export function readRewindYears(username: string, authorization?: string) {
	const request = api().get(`/users/${username}/rewinds`);
	return authorization
		? request.set("Authorization", authorization)
		: request;
}

export function regenerationOf(
	generatedAt: string,
	overrides: Partial<GenerateRewindRequest> = {}
): GenerateRewindRequest {
	return {
		...FIRST_GENERATION,
		expectedGeneratedAt: generatedAt,
		...overrides
	};
}

export function mockAiRecap(
	implementation: () => Promise<RewindAiRecap> = () =>
		Promise.resolve(AI_RECAP)
) {
	return mock.method(
		rewindRecapService,
		"generateRewindAiRecap",
		implementation
	);
}

export function mockPremiumStats(
	implementation: () => RewindPremiumStats = () => PREMIUM_STATS
) {
	return mock.method(
		premiumStatsUtil,
		"buildRewindPremiumStats",
		implementation
	);
}

export function findRewindRow(account: Account, year: number) {
	return Rewind.findOne({ where: { userId: account.user.id, year } });
}

export function storeRewind(
	account: Account,
	year: number,
	fields: Partial<Rewind> = {}
) {
	return Rewind.create({
		userId: account.user.id,
		year,
		language: "en",
		generatedAt: new Date("2026-12-02T10:00:00.000Z"),
		...fields
	});
}
