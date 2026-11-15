import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { PremiumGrant } from "../../src/premium-access/premium-grant.model";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	readRewind,
	readRewindYears,
	signUpOn
} from "./rewind-generation.helper";

const SIGN_UP_DATE = "2025-01-15T00:00:00.000Z";

export interface YearBlock {
	year: number;
	generationBlockedBy: string | null;
}

export async function seedRewindPeriodWorld(): Promise<{
	platform: Platform;
	game: Game;
}> {
	const [platform, game] = await Promise.all([
		createPlatform(),
		createGame({ title: "Hades" })
	]);
	return { platform, game };
}

export function clearRewindEditions() {
	return RewindEdition.destroy({ where: {} });
}

export async function playerWithTwoYears(
	world: { platform: Platform; game: Game },
	role: Account["user"]["role"] = "user"
): Promise<Account> {
	const player = await signUpOn(SIGN_UP_DATE, role);
	await addRun(player, world.game, world.platform, {
		finishedAt: "2025-05-05"
	});
	await addRun(player, world.game, world.platform, {
		finishedAt: "2026-06-06"
	});
	return player;
}

export function giftRewindPremium(player: Account) {
	return PremiumGrant.create({
		userId: player.user.id,
		feature: "rewind.premium",
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
	});
}

export async function readYearBlocks(
	owner: Account,
	authorization?: string
): Promise<YearBlock[]> {
	const response = await readRewindYears(
		owner.user.username,
		authorization
	).expect(200);
	return response.body.data.years.map(
		(summary: YearBlock & Record<string, unknown>) => ({
			year: summary.year,
			generationBlockedBy: summary.generationBlockedBy
		})
	);
}

export async function readPeriod(owner: Account, authorization?: string) {
	const response = await readRewindYears(
		owner.user.username,
		authorization
	).expect(200);
	return response.body.data.period;
}

export async function readControlsPeriodStatus(
	owner: Account,
	year: number
): Promise<string> {
	const response = await readRewind(
		owner.user.username,
		year,
		owner.authorization
	).expect(200);
	return response.body.data.ownerControls.periodStatus;
}
