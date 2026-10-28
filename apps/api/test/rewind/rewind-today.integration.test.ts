import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { environmentConfig } from "../../src/common/config/environment.config";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

let platform: Platform;
let games: Game[];

async function signUpOn(createdAt: string): Promise<Account> {
	const account = await createUserWithSession();
	await User.update(
		{ createdAt: new Date(createdAt) },
		{ where: { id: account.user.id }, silent: true }
	);
	await account.user.reload();
	return account;
}

function finishGame(account: Account, game: Game, finishedAt: string) {
	return Backlog.create({
		userId: account.user.id,
		gameId: game.id,
		platformId: platform.id,
		status: "completed",
		finishedAt,
		realDuration: 10
	});
}

useTestDatabase(async () => {
	platform = await createPlatform();
	games = await Promise.all([createGame(), createGame(), createGame()]);
});

void describe("REWIND_TODAY", () => {
	void it("is read from the environment outside production", () => {
		assert.equal(environmentConfig.REWIND_TODAY, "2026-12-15");
		assert.notEqual(environmentConfig.NODE_ENV, "prod");
	});

	void it("opens the current year and its spotlight from the override", async () => {
		const player = await signUpOn("2025-03-01T00:00:00.000Z");
		await finishGame(player, games[0]!, "2025-04-04");
		await finishGame(player, games[1]!, "2026-06-06");

		const list = await api()
			.get(`/users/${player.user.username}/rewinds`)
			.expect(200);
		assert.equal(list.body.data.spotlightYear, 2026);
		assert.deepEqual(
			list.body.data.years.map((year: { year: number }) => year.year),
			[2026, 2025]
		);

		const detail = await api()
			.get(`/users/${player.user.username}/rewinds/2026`)
			.expect(200);
		assert.equal(detail.body.data.isSpotlight, true);
		assert.deepEqual(detail.body.data.otherYears, [2025]);
	});

	void it("still hides the years before the sign-up", async () => {
		const newcomer = await signUpOn("2026-11-20T00:00:00.000Z");
		await finishGame(newcomer, games[0]!, "2025-12-31");
		await finishGame(newcomer, games[2]!, "2026-11-25");

		const list = await api()
			.get(`/users/${newcomer.user.username}/rewinds`)
			.expect(200);
		assert.deepEqual(list.body.data, {
			spotlightYear: 2026,
			years: [list.body.data.years[0]]
		});
		assert.equal(list.body.data.years[0].year, 2026);

		const imported = await api().get(
			`/users/${newcomer.user.username}/rewinds/2025`
		);
		assert.equal(imported.status, 404);
		assert.equal(imported.body.type, "REWIND_NOT_FOUND");
	});

	void it("keeps the next year closed", async () => {
		const player = await signUpOn("2025-03-01T00:00:00.000Z");
		await finishGame(player, games[0]!, "2027-01-02");

		const response = await api().get(
			`/users/${player.user.username}/rewinds/2027`
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "REWIND_NOT_FOUND");
	});
});
