import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { Op } from "sequelize";

import { Backlog } from "../../src/backlog/backlog.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { Rewind } from "../../src/rewind/rewind.model";
import {
	type RewindPremiumStatsInput,
	type RewindRecapInput
} from "../../src/rewind-recap/rewind-recap.interface";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	AI_RECAP,
	findRewindRow,
	FIRST_GENERATION,
	generate,
	mockAiRecap,
	mockPremiumStats,
	PREMIUM_STATS,
	readRewind,
	readRewindYears,
	regenerationOf,
	requestAiRecap,
	signUpOn
} from "./rewind-generation.helper";

let platform: Platform;
let games: Record<"hades" | "celeste" | "secret" | "tunic", Game>;

async function playerWithYears(role: Account["user"]["role"] = "user") {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
	await addRun(player, games.hades, platform, {
		startedAt: "2026-02-01",
		finishedAt: "2026-03-10",
		realDuration: 20
	});
	await addRun(player, games.secret, platform, {
		finishedAt: "2026-05-05",
		realDuration: 50,
		isPublic: false
	});
	await addRun(player, games.celeste, platform, {
		finishedAt: "2025-07-07",
		realDuration: 8
	});
	return player;
}

function titlesOf(runs: { game: { title: string } }[]): string[] {
	return runs.map(run => run.game.title).sort();
}

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		secret: await createGame({ title: "Secret Game" }),
		tunic: await createGame({ title: "Tunic" })
	};
});

afterEach(() => {
	mock.restoreAll();
});

void describe("reading a Rewind before and after generating it", () => {
	void it("hides an ungenerated year from visitors and flags it for the owner", async () => {
		const player = await playerWithYears();
		const stranger = await createUserWithSession();
		const { username } = player.user;

		const ownList = await readRewindYears(
			username,
			player.authorization
		).expect(200);
		assert.equal(ownList.body.data.spotlightYear, 2026);
		assert.deepEqual(
			ownList.body.data.years.map(
				(year: { year: number; isGenerated: boolean }) => [
					year.year,
					year.isGenerated
				]
			),
			[
				[2026, false],
				[2025, false]
			]
		);

		for (const authorization of [undefined, stranger.authorization]) {
			const list = await readRewindYears(username, authorization).expect(
				200
			);
			assert.deepEqual(list.body.data, {
				spotlightYear: null,
				years: []
			});

			const detail = await readRewind(username, 2026, authorization);
			assert.equal(detail.status, 404);
			assert.equal(detail.body.type, "REWIND_NOT_FOUND");
		}

		const ownDetail = await readRewind(
			username,
			2026,
			player.authorization
		);
		assert.equal(ownDetail.status, 404);
		assert.equal(ownDetail.body.type, "REWIND_NOT_GENERATED");

		await generate(player, 2026).expect(201);

		const list = await readRewindYears(username).expect(200);
		assert.equal(list.body.data.spotlightYear, 2026);
		assert.deepEqual(
			list.body.data.years.map(
				(year: { year: number; isGenerated: boolean }) => [
					year.year,
					year.isGenerated
				]
			),
			[[2026, true]]
		);

		const detail = await readRewind(username, 2026).expect(200);
		assert.deepEqual(detail.body.data.otherYears, []);
		assert.equal(detail.body.data.ownerControls, null);
		assert.equal(detail.body.data.language, "en");
		assert.equal(detail.body.data.totals.finished, 1);

		const own = await readRewind(
			username,
			2026,
			player.authorization
		).expect(200);
		assert.deepEqual(own.body.data.otherYears, [2025]);
		assert.equal(own.body.data.totals.finished, 2);
		assert.ok(own.body.data.ownerControls);

		const stillHidden = await readRewind(username, 2025);
		assert.equal(stillHidden.status, 404);
		assert.equal(stillHidden.body.type, "REWIND_NOT_FOUND");
	});

	void it("keeps the private-runs rule for the live numbers of visitors", async () => {
		const player = await playerWithYears();
		await generate(player, 2026, {
			...FIRST_GENERATION,
			includePrivateRuns: true
		}).expect(201);

		const visitor = await readRewind(player.user.username, 2026).expect(
			200
		);

		assert.equal(JSON.stringify(visitor.body).includes("Secret"), false);
		assert.equal(visitor.body.data.totals.hoursPlayed, 20);
	});
});

void describe("POST /users/me/rewinds/:year", () => {
	void it("creates the first generation with 201 and the owner view", async () => {
		const player = await playerWithYears();
		const aiMock = mockAiRecap();

		const response = await generate(player, 2026, {
			language: "es",
			includePrivateRuns: true,
			expectedGeneratedAt: null
		}).expect(201);

		const data = response.body.data;
		assert.equal(data.year, 2026);
		assert.equal(data.language, "es");
		assert.ok(!Number.isNaN(Date.parse(data.generatedAt)));
		assert.equal(data.aiRecap, null);
		assert.equal(data.premiumStats, null);
		assert.deepEqual(data.ownerControls, {
			includesPrivateRuns: true,
			regenerationsLeft: 1,
			graceEndsAt: null,
			canRegenerate: true,
			aiRecapState: "unavailable"
		});
		assert.equal(data.totals.finished, 2);
		assert.equal(aiMock.mock.callCount(), 0);

		const row = await findRewindRow(player, 2026);
		assert.equal(row?.aiRecapStatus, "none");
		assert.equal(row?.regenerationsUsed, 0);
	});

	void it("regenerates once with 200 and then answers REWIND_REGENERATION_LIMIT", async () => {
		const player = await playerWithYears();

		const first = await generate(player, 2026).expect(201);
		const second = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, { language: "es" })
		).expect(200);

		assert.equal(second.body.data.language, "es");
		assert.notEqual(
			second.body.data.generatedAt,
			first.body.data.generatedAt
		);
		assert.equal(second.body.data.ownerControls.regenerationsLeft, 0);
		assert.equal(second.body.data.ownerControls.canRegenerate, false);

		const third = await generate(
			player,
			2026,
			regenerationOf(second.body.data.generatedAt)
		);
		assert.equal(third.status, 409);
		assert.equal(third.body.type, "REWIND_REGENERATION_LIMIT");

		const row = await findRewindRow(player, 2026);
		assert.equal(row?.regenerationsUsed, 1);
		assert.equal(row?.language, "es");
		assert.equal(
			row?.generatedAt.toISOString(),
			second.body.data.generatedAt
		);
	});

	void it("answers REWIND_GENERATION_CONFLICT to stale or missing expected dates without spending", async () => {
		const player = await playerWithYears();
		const first = await generate(player, 2026).expect(201);

		const repeatedFirst = await generate(player, 2026);
		assert.equal(repeatedFirst.status, 409);
		assert.equal(repeatedFirst.body.type, "REWIND_GENERATION_CONFLICT");

		for (const expected of [
			"2026-12-01T00:00:00.000Z",
			new Date(Date.parse(first.body.data.generatedAt) + 1).toISOString()
		]) {
			const stale = await generate(
				player,
				2026,
				regenerationOf(expected)
			);
			assert.equal(stale.status, 409);
			assert.equal(stale.body.type, "REWIND_GENERATION_CONFLICT");
		}

		const fresh = await generate(player, 2025, {
			...FIRST_GENERATION,
			expectedGeneratedAt: first.body.data.generatedAt
		});
		assert.equal(fresh.status, 409);
		assert.equal(fresh.body.type, "REWIND_GENERATION_CONFLICT");
		assert.equal(await findRewindRow(player, 2025), null);

		const row = await findRewindRow(player, 2026);
		assert.equal(row?.regenerationsUsed, 0);
	});

	void it("lets exactly one of two simultaneous first generations win", async () => {
		const player = await playerWithYears();

		const responses = await Promise.all([
			generate(player, 2026),
			generate(player, 2026),
			generate(player, 2026)
		]);

		const statuses = responses.map(response => response.status).sort();
		assert.deepEqual(statuses, [201, 409, 409]);
		for (const response of responses.filter(r => r.status === 409))
			assert.equal(response.body.type, "REWIND_GENERATION_CONFLICT");
		assert.equal(
			await Rewind.count({ where: { userId: player.user.id } }),
			1
		);
	});

	void it("lets exactly one of two simultaneous regenerations win and spends only one", async () => {
		const player = await playerWithYears();
		const first = await generate(player, 2026).expect(201);
		const body = regenerationOf(first.body.data.generatedAt);

		const responses = await Promise.all([
			generate(player, 2026, body),
			generate(player, 2026, body)
		]);

		assert.deepEqual(
			responses.map(response => response.status).sort(),
			[200, 409]
		);
		const loser = responses.find(response => response.status === 409);
		assert.equal(loser?.body.type, "REWIND_GENERATION_CONFLICT");
		const row = await findRewindRow(player, 2026);
		assert.equal(row?.regenerationsUsed, 1);
	});

	void it("answers 404 REWIND_NOT_FOUND for closed years, years without data or before the sign-up", async () => {
		const player = await playerWithYears();
		await addRun(player, games.tunic, platform, {
			finishedAt: "2024-04-04"
		});
		await addRun(player, games.tunic, platform, {
			finishedAt: "2027-01-02"
		});

		for (const year of [2027, 2023, 2024, 2000, 2100]) {
			const response = await generate(player, year);
			assert.equal(response.status, 404, `year ${year}`);
			assert.equal(response.body.type, "REWIND_NOT_FOUND");
		}
		assert.equal(
			await Rewind.count({ where: { userId: player.user.id } }),
			0
		);
	});

	void it("counts a year with only private runs as a year with data", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, games.secret, platform, {
			finishedAt: "2026-04-04",
			isPublic: false
		});

		await generate(player, 2026).expect(201);

		const visitor = await readRewind(player.user.username, 2026);
		assert.equal(visitor.status, 404);
		assert.equal(visitor.body.type, "REWIND_NOT_FOUND");
	});

	void it("answers 422 to garbage bodies and years", async () => {
		const player = await playerWithYears();
		const garbageBodies: unknown[] = [
			{ ...FIRST_GENERATION, language: "fr" },
			{ ...FIRST_GENERATION, language: "<b>es</b>" },
			{ ...FIRST_GENERATION, includePrivateRuns: "true" },
			{ ...FIRST_GENERATION, includePrivateRuns: 1 },
			{ ...FIRST_GENERATION, expectedGeneratedAt: "yesterday" },
			{ ...FIRST_GENERATION, expectedGeneratedAt: "🔥".repeat(2000) },
			{ ...FIRST_GENERATION, role: "admin" },
			{ language: "en" },
			{},
			[]
		];

		for (const body of garbageBodies) {
			const response = await generate(player, 2026, body);
			assert.equal(response.status, 422, JSON.stringify(body));
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		}
		for (const year of ["1999", "abc", "2026.5", "-2026", "2101"]) {
			const response = await generate(player, year);
			assert.equal(response.status, 422, `year ${year}`);
		}
		assert.equal(await findRewindRow(player, 2026), null);
	});

	void it("requires a session", async () => {
		const anonymous = await api()
			.post("/users/me/rewinds/2026")
			.send(FIRST_GENERATION);
		assert.equal(anonymous.status, 422);
		assert.equal(anonymous.body.type, "AUTH_SCHEMA_INVALID");

		const garbage = await api()
			.post("/users/me/rewinds/2026")
			.set("Authorization", "Bearer not-a-token")
			.send(FIRST_GENERATION);
		assert.equal(garbage.status, 401);
	});

	void it("deletes the Rewinds of a deleted user", async () => {
		const player = await playerWithYears();
		await generate(player, 2026).expect(201);
		await generate(player, 2025).expect(201);

		await Backlog.destroy({ where: { userId: player.user.id } });
		await User.destroy({ where: { id: player.user.id } });

		assert.equal(
			await Rewind.count({ where: { userId: player.user.id } }),
			0
		);
	});
});

void describe("premium generation", () => {
	void it("stores the AI recap and premium stats and shows them to every visitor", async () => {
		const player = await playerWithYears("premium");
		const stranger = await createUserWithSession();
		const aiMock = mockAiRecap();
		mockPremiumStats();

		const response = await generate(player, 2026, {
			...FIRST_GENERATION,
			language: "es"
		}).expect(201);

		assert.deepEqual(response.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(response.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(response.body.data.ownerControls.aiRecapState, "ready");
		const input = aiMock.mock.calls[0]?.arguments[0] as RewindRecapInput;
		assert.equal(input.language, "es");
		assert.equal(input.year, 2026);
		assert.equal(input.rewind.language, "es");
		assert.deepEqual(input.rewind.premiumStats, PREMIUM_STATS);
		assert.equal(input.previousYearTotals?.finished, 1);

		for (const authorization of [undefined, stranger.authorization]) {
			const visitor = await readRewind(
				player.user.username,
				2026,
				authorization
			).expect(200);
			assert.deepEqual(visitor.body.data.aiRecap, AI_RECAP);
			assert.deepEqual(visitor.body.data.premiumStats, PREMIUM_STATS);
			assert.equal(visitor.body.data.ownerControls, null);
			assert.equal(visitor.body.data.language, "es");
		}
		assert.equal(aiMock.mock.callCount(), 1);
	});

	void it("answers 201 with a failed recap when the AI fails, and retries with ai-recap", async () => {
		const player = await playerWithYears("premium");
		mockPremiumStats();
		const failing = mockAiRecap(() => Promise.reject(new Error("timeout")));

		const response = await generate(player, 2026).expect(201);

		assert.equal(response.body.data.aiRecap, null);
		assert.deepEqual(response.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(response.body.data.ownerControls.aiRecapState, "failed");
		assert.equal(failing.mock.callCount(), 1);

		const retryFailure = await requestAiRecap(player, 2026);
		assert.equal(retryFailure.status, 503);
		assert.equal(retryFailure.body.type, "REWIND_AI_RECAP_FAILED");
		assert.equal(
			(await findRewindRow(player, 2026))?.aiRecapStatus,
			"failed"
		);

		failing.mock.mockImplementation(() => Promise.resolve(AI_RECAP));
		const retry = await requestAiRecap(player, 2026).expect(200);
		assert.deepEqual(retry.body.data.aiRecap, AI_RECAP);
		assert.equal(retry.body.data.ownerControls.aiRecapState, "ready");
		assert.equal(retry.body.data.ownerControls.regenerationsLeft, 1);

		const again = await requestAiRecap(player, 2026);
		assert.equal(again.status, 409);
		assert.equal(again.body.type, "REWIND_AI_RECAP_EXISTS");
	});

	void it("answers 201 with a failed recap when the premium stats crash", async () => {
		const player = await playerWithYears("premium");
		mockPremiumStats(() => {
			throw new Error("stats bug");
		});
		const aiMock = mockAiRecap();

		const response = await generate(player, 2026).expect(201);

		assert.equal(response.body.data.ownerControls.aiRecapState, "failed");
		assert.equal(response.body.data.premiumStats, null);
		assert.equal(aiMock.mock.callCount(), 0);
	});

	void it("answers REWIND_AI_RECAP_IN_PROGRESS for a recent pending recap and lets a stale one retry", async () => {
		const player = await playerWithYears("premium");
		mockPremiumStats();
		const aiMock = mockAiRecap(() => Promise.reject(new Error("down")));
		await generate(player, 2026).expect(201);

		await Rewind.update(
			{ aiRecapStatus: "pending", aiRecapRequestedAt: new Date() },
			{ where: { userId: player.user.id, year: 2026 } }
		);
		const pending = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(pending.body.data.ownerControls.aiRecapState, "failed");

		const busy = await requestAiRecap(player, 2026);
		assert.equal(busy.status, 409);
		assert.equal(busy.body.type, "REWIND_AI_RECAP_IN_PROGRESS");

		await Rewind.update(
			{ aiRecapRequestedAt: new Date(Date.now() - 3 * 60 * 1000) },
			{ where: { userId: player.user.id, year: 2026 } }
		);
		aiMock.mock.mockImplementation(() => Promise.resolve(AI_RECAP));
		await requestAiRecap(player, 2026).expect(200);
	});

	void it("answers one ai-recap and rejects the double click", async () => {
		const player = await playerWithYears("premium");
		mockPremiumStats();
		const aiMock = mockAiRecap(() => Promise.reject(new Error("down")));
		await generate(player, 2026).expect(201);
		aiMock.mock.mockImplementation(
			() =>
				new Promise<typeof AI_RECAP>(resolve => {
					setTimeout(() => resolve(AI_RECAP), 50);
				})
		);

		const responses = await Promise.all([
			requestAiRecap(player, 2026),
			requestAiRecap(player, 2026)
		]);

		assert.deepEqual(
			responses.map(response => response.status).sort(),
			[200, 409]
		);
		assert.equal(
			responses.find(response => response.status === 409)?.body.type,
			"REWIND_AI_RECAP_IN_PROGRESS"
		);
		assert.equal(aiMock.mock.callCount(), 2);
	});

	void it("leaves private runs out of the AI and stats unless the owner includes them", async () => {
		const player = await playerWithYears("premium");
		await addRun(player, games.tunic, platform, {
			status: "playing",
			startedAt: "2026-08-08",
			isPublic: false
		});
		const statsMock = mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);

		const publicInput = aiMock.mock.calls[0]
			?.arguments[0] as RewindRecapInput;
		const publicStats = statsMock.mock.calls[0]
			?.arguments[0] as RewindPremiumStatsInput;
		assert.deepEqual(titlesOf(publicInput.runs), ["Celeste", "Hades"]);
		assert.deepEqual(titlesOf(publicStats.runs), ["Celeste", "Hades"]);
		assert.equal(JSON.stringify(publicInput).includes("Secret"), false);
		assert.equal(JSON.stringify(publicInput).includes("Tunic"), false);
		assert.equal(publicStats.addedByMonth.length, 12);

		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, {
				includePrivateRuns: true
			})
		).expect(200);

		const privateInput = aiMock.mock.calls[1]
			?.arguments[0] as RewindRecapInput;
		const privateStats = statsMock.mock.calls[1]
			?.arguments[0] as RewindPremiumStatsInput;
		assert.deepEqual(titlesOf(privateInput.runs), [
			"Celeste",
			"Hades",
			"Secret Game",
			"Tunic"
		]);
		assert.deepEqual(
			titlesOf(privateStats.runs),
			titlesOf(privateInput.runs)
		);
		assert.equal(privateInput.rewind.totals.finished, 2);
	});

	void it("counts the runs added to the backlog per month with the private-runs rule", async () => {
		const player = await playerWithYears("premium");
		const [march, july] = await Promise.all([
			addRun(player, games.tunic, platform, { status: "not_started" }),
			addRun(player, games.celeste, platform, {
				status: "not_started",
				isPublic: false
			})
		]);
		await Promise.all([
			Backlog.update(
				{ createdAt: new Date("2026-03-31T23:30:00.000Z") },
				{ where: { id: march.id }, silent: true }
			),
			Backlog.update(
				{ createdAt: new Date("2026-07-01T00:00:00.000Z") },
				{ where: { id: july.id }, silent: true }
			),
			Backlog.update(
				{ createdAt: new Date("2025-07-01T00:00:00.000Z") },
				{
					where: {
						userId: player.user.id,
						id: { [Op.notIn]: [march.id, july.id] }
					},
					silent: true
				}
			)
		]);
		const statsMock = mockPremiumStats();
		mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, {
				includePrivateRuns: true
			})
		).expect(200);

		const [publicCall, privateCall] = statsMock.mock.calls.map(
			call => (call.arguments[0] as RewindPremiumStatsInput).addedByMonth
		);
		assert.deepEqual(publicCall, [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
		assert.deepEqual(privateCall, [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
	});
});

void describe("premium changes", () => {
	void it("lets a free owner who becomes premium add the AI recap without spending a regeneration", async () => {
		const player = await playerWithYears();
		mockPremiumStats();
		const aiMock = mockAiRecap();
		await generate(player, 2026, {
			...FIRST_GENERATION,
			language: "es"
		}).expect(201);

		const free = await requestAiRecap(player, 2026);
		assert.equal(free.status, 402);
		assert.equal(free.body.type, "REWIND_AI_RECAP_PREMIUM_REQUIRED");

		await player.user.update({ role: "premium" });
		const own = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);
		assert.equal(own.body.data.ownerControls.aiRecapState, "available");

		const added = await requestAiRecap(player, 2026).expect(200);
		assert.deepEqual(added.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(added.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(added.body.data.ownerControls.regenerationsLeft, 1);
		const input = aiMock.mock.calls[0]?.arguments[0] as RewindRecapInput;
		assert.equal(input.language, "es");
		assert.equal((await findRewindRow(player, 2026))?.regenerationsUsed, 0);
	});

	void it("keeps the AI recap of an owner who lost premium, also after a regeneration", async () => {
		const player = await playerWithYears("premium");
		mockPremiumStats();
		const aiMock = mockAiRecap();
		const first = await generate(player, 2026).expect(201);

		await player.user.update({ role: "user" });

		const visitor = await readRewind(player.user.username, 2026).expect(
			200
		);
		assert.deepEqual(visitor.body.data.aiRecap, AI_RECAP);
		const regenerated = await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, { language: "es" })
		).expect(200);
		assert.deepEqual(regenerated.body.data.aiRecap, AI_RECAP);
		assert.deepEqual(regenerated.body.data.premiumStats, PREMIUM_STATS);
		assert.equal(regenerated.body.data.ownerControls.aiRecapState, "ready");
		assert.equal(aiMock.mock.callCount(), 1);
	});

	void it("answers 404 REWIND_NOT_GENERATED to ai-recap for an ungenerated year", async () => {
		const player = await playerWithYears("premium");

		for (const year of [2026, 2024]) {
			const response = await requestAiRecap(player, year);
			assert.equal(response.status, 404);
			assert.equal(response.body.type, "REWIND_NOT_GENERATED");
		}
		const garbage = await requestAiRecap(player, "abc");
		assert.equal(garbage.status, 422);
	});

	void it("treats moderators and admins as premium", async () => {
		for (const role of ["moderator", "admin"] as const) {
			const player = await playerWithYears(role);
			mockPremiumStats();
			mockAiRecap();

			const response = await generate(player, 2026).expect(201);

			assert.equal(
				response.body.data.ownerControls.aiRecapState,
				"ready"
			);
			mock.restoreAll();
		}
	});
});
