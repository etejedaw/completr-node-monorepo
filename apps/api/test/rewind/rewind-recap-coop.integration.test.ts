import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { CoopRun } from "../../src/coop-runs/coop-run.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { type RewindRecapInput } from "../../src/rewind-recap/rewind-recap.interface";
import { buildRewindRecapContent } from "../../src/rewind-recap/utils/build-rewind-recap-content.util";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	generate,
	mockAiRecap,
	mockPremiumStats,
	regenerationOf,
	signUpOn
} from "./rewind-generation.helper";

interface RecapPayload {
	patterns: { bySocial: { name: string; finishedTitles: string[] }[] };
	games: { columns: string[]; rows: (string | number | null)[][] };
}

let platform: Platform;
let games: Record<"hades" | "itTakesTwo" | "portal" | "overcooked", Game>;

async function linkCoop(...backlogs: Backlog[]) {
	const [first] = backlogs;
	if (!first) throw new Error("linkCoop needs at least one backlog");
	const coopRun = await CoopRun.create({ gameId: first.gameId });
	await Backlog.update(
		{ coopRunId: coopRun.id },
		{ where: { id: backlogs.map(backlog => backlog.id) } }
	);
}

function lastInput(aiMock: ReturnType<typeof mockAiRecap>): RewindRecapInput {
	return aiMock.mock.calls.at(-1)?.arguments[0] as RewindRecapInput;
}

function serializedRecap(input: RewindRecapInput): string {
	return buildRewindRecapContent(input, new Date("2026-12-15T00:00:00.000Z"));
}

function coopColumn(input: RewindRecapInput): Record<string, string | null> {
	const payload = JSON.parse(serializedRecap(input)) as RecapPayload;
	const titleIndex = payload.games.columns.indexOf("title");
	const coopIndex = payload.games.columns.indexOf("coopWith");
	return Object.fromEntries(
		payload.games.rows.map(row => [
			String(row[titleIndex]),
			(row[coopIndex] as string | null) ?? null
		])
	);
}

function assertPartnerHidden(input: RewindRecapInput, partners: Account[]) {
	const serialized = serializedRecap(input);
	for (const partner of partners) {
		assert.equal(serialized.includes(partner.user.id), false);
		assert.equal(serialized.includes(partner.user.username), false);
		assert.equal(serialized.includes(partner.user.name), false);
	}
}

async function coopYear() {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
	const friend = await signUpOn("2025-01-15T00:00:00.000Z");
	const sibling = await signUpOn("2025-01-15T00:00:00.000Z");

	await addRun(player, games.hades, platform, {
		startedAt: "2026-01-05",
		finishedAt: "2026-02-01"
	});
	const playerTwo = await addRun(player, games.itTakesTwo, platform, {
		startedAt: "2026-03-01",
		finishedAt: "2026-04-01"
	});
	const friendTwo = await addRun(friend, games.itTakesTwo, platform, {
		startedAt: "2026-03-01",
		finishedAt: "2026-04-01"
	});
	await linkCoop(playerTwo, friendTwo);

	const playerPortal = await addRun(player, games.portal, platform, {
		startedAt: "2026-06-01",
		finishedAt: "2026-06-20"
	});
	const friendPortal = await addRun(friend, games.portal, platform, {
		startedAt: "2026-06-01",
		finishedAt: "2026-06-20",
		isPublic: false
	});
	const siblingPortal = await addRun(sibling, games.portal, platform, {
		status: "playing",
		startedAt: "2026-06-01"
	});
	await linkCoop(playerPortal, friendPortal, siblingPortal);

	return { player, friend, sibling };
}

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		itTakesTwo: await createGame({ title: "It Takes Two" }),
		portal: await createGame({ title: "Portal 2" }),
		overcooked: await createGame({ title: "Overcooked" })
	};
});

afterEach(() => {
	mock.restoreAll();
});

void describe("co-op partners in the AI recap", () => {
	void it("labels each partner the same way in every game and never sends who they are", async () => {
		const { player, friend, sibling } = await coopYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		await generate(player, 2026).expect(201);

		const input = lastInput(aiMock);
		const partnerIds = new Set(
			input.coopPartners.map(partner => partner.partnerId)
		);
		assert.deepEqual(
			partnerIds,
			new Set([friend.user.id, sibling.user.id])
		);
		const coop = coopColumn(input);
		assert.equal(coop.Hades, null);
		assert.equal(coop["It Takes Two"], "P1");
		assert.match(coop["Portal 2"] ?? "", /^P1\/P2$|^P2\/P1$/);
		assertPartnerHidden(input, [friend, sibling]);
	});

	void it("splits closed games into solo and co-op for the AI", async () => {
		const { player } = await coopYear();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		await generate(player, 2026).expect(201);

		const payload = JSON.parse(
			serializedRecap(lastInput(aiMock))
		) as RecapPayload;
		assert.deepEqual(
			payload.patterns.bySocial.map(group => [
				group.name,
				[...group.finishedTitles].sort()
			]),
			[
				["solo", ["Hades"]],
				["co-op", ["It Takes Two", "Portal 2"]]
			]
		);
	});

	void it("drops a partner who left the run and keeps the game as solo", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
		const friend = await signUpOn("2025-01-15T00:00:00.000Z");
		const playerRun = await addRun(player, games.overcooked, platform, {
			startedAt: "2026-02-01",
			finishedAt: "2026-02-10"
		});
		const friendRun = await addRun(friend, games.overcooked, platform, {
			startedAt: "2026-02-01",
			finishedAt: "2026-02-10"
		});
		await linkCoop(playerRun, friendRun);
		await friendRun.destroy();
		mockPremiumStats();
		const aiMock = mockAiRecap();

		await generate(player, 2026).expect(201);

		const input = lastInput(aiMock);
		assert.deepEqual(input.coopPartners, []);
		assert.equal(coopColumn(input).Overcooked, null);
	});

	void it("leaves a private co-op run out entirely unless private runs are included", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
		const friend = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, games.hades, platform, {
			startedAt: "2026-01-05",
			finishedAt: "2026-02-01"
		});
		const hiddenRun = await addRun(player, games.overcooked, platform, {
			startedAt: "2026-02-01",
			finishedAt: "2026-02-10",
			isPublic: false
		});
		const friendRun = await addRun(friend, games.overcooked, platform, {
			startedAt: "2026-02-01",
			finishedAt: "2026-02-10"
		});
		await linkCoop(hiddenRun, friendRun);
		mockPremiumStats();
		const aiMock = mockAiRecap();

		const first = await generate(player, 2026).expect(201);
		const publicOnly = lastInput(aiMock);
		assert.deepEqual(publicOnly.coopPartners, []);
		assert.equal("Overcooked" in coopColumn(publicOnly), false);

		await generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt, {
				includePrivateRuns: true
			})
		).expect(200);
		assert.equal(coopColumn(lastInput(aiMock)).Overcooked, "P1");
	});
});
