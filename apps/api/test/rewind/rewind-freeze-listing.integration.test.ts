import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { type RewindYearSummary } from "../../src/rewind/rewind.interface";
import { Rewind } from "../../src/rewind/rewind.model";
import { freezeClosedRewindEditions } from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createRewindEdition
} from "../helpers/factories.helper";
import { closeEdition } from "./rewind-freeze.helper";
import {
	type Account,
	addRun,
	findRewindRow,
	FIRST_GENERATION,
	generate,
	mockAiRecap,
	mockPremiumStats,
	openRewindEdition2026,
	readRewind,
	readRewindYears,
	regenerationOf,
	signUpOn
} from "./rewind-generation.helper";

const SECRET_NOTE = "the codes of the vault are 4815162342";

let platform: Platform;
let games: Record<"hades" | "celeste" | "tunic" | "gris", Game>;

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		tunic: await createGame({ title: "Tunic" }),
		gris: await createGame({ title: "Gris" })
	};
});

beforeEach(async () => {
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
	await openRewindEdition2026();
});

afterEach(() => {
	mock.restoreAll();
});

function mockPremiumGeneration() {
	mockPremiumStats();
	return mockAiRecap();
}

function summariesOf(response: { body: { data: unknown } }) {
	const data = response.body.data as { years: RewindYearSummary[] };
	return data.years.map(summary => ({
		year: summary.year,
		isGenerated: summary.isGenerated,
		finishedCount: summary.finishedCount,
		covers: summary.covers.map(cover => cover.title)
	}));
}

async function premiumPlayerWithTwoYears() {
	const player = await signUpOn("2024-01-15T00:00:00.000Z", "premium");
	await addRun(player, games.hades, platform, { finishedAt: "2026-03-10" });
	await addRun(player, games.tunic, platform, { finishedAt: "2025-05-05" });
	return player;
}

async function generateBothAndFreeze(player: Account) {
	await generate(player, 2026).expect(201);
	await generate(player, 2025).expect(201);
	await closeEdition(2026);
	await freezeClosedRewindEditions();
}

async function giveThreePlatinums(player: Account) {
	await GamePlatinum.bulkCreate(
		[games.hades, games.celeste, games.tunic].map(game => ({
			userId: player.user.id,
			gameId: game.id,
			platinumedAt: "2026-04-01"
		}))
	);
}

void describe("listing frozen years", () => {
	void it("keeps frozen years listed as at the close while the library changes, and live years live", async () => {
		mockPremiumGeneration();
		const player = await premiumPlayerWithTwoYears();
		await generateBothAndFreeze(player);

		await Backlog.destroy({
			where: { userId: player.user.id, gameId: games.hades.id }
		});
		await Backlog.update(
			{ isPublic: false },
			{ where: { userId: player.user.id, gameId: games.tunic.id } }
		);
		await addRun(player, games.celeste, platform, {
			finishedAt: "2026-07-07"
		});
		await addRun(player, games.gris, platform, {
			finishedAt: "2024-02-02"
		});
		const [visitorList, ownerList, visitorRewind] = await Promise.all([
			readRewindYears(player.user.username),
			readRewindYears(player.user.username, player.authorization),
			readRewind(player.user.username, 2026)
		]);
		await addRun(player, games.hades, platform, {
			finishedAt: "2024-09-09"
		});
		const ownerAfterAnotherRun = await readRewindYears(
			player.user.username,
			player.authorization
		);

		const frozenYears = [
			{
				year: 2026,
				isGenerated: true,
				finishedCount: 1,
				covers: ["Hades"]
			},
			{
				year: 2025,
				isGenerated: true,
				finishedCount: 1,
				covers: ["Tunic"]
			}
		];
		assert.deepEqual(summariesOf(visitorList), frozenYears);
		assert.deepEqual(summariesOf(ownerList), [
			...frozenYears,
			{
				year: 2024,
				isGenerated: false,
				finishedCount: 1,
				covers: ["Gris"]
			}
		]);
		assert.deepEqual(visitorRewind.body.data.otherYears, [2025]);
		assert.deepEqual(summariesOf(ownerAfterAnotherRun).at(-1), {
			year: 2024,
			isGenerated: false,
			finishedCount: 2,
			covers: ["Hades", "Gris"]
		});
	});

	void it("freezes on a burst of list reads right after the close, once per Rewind", async () => {
		mockPremiumGeneration();
		const player = await premiumPlayerWithTwoYears();
		await generate(player, 2026).expect(201);
		await generate(player, 2025).expect(201);
		await closeEdition(2026);

		const reads = await Promise.all([
			readRewindYears(player.user.username),
			readRewindYears(player.user.username),
			readRewindYears(player.user.username, player.authorization),
			readRewind(player.user.username, 2025),
			readRewind(player.user.username, 2026, player.authorization)
		]);
		const rows = await Rewind.findAll({
			where: { userId: player.user.id }
		});
		const report = await freezeClosedRewindEditions();

		for (const read of reads) assert.equal(read.status, 200);
		assert.equal(rows.length, 2);
		assert.ok(rows.every(row => row.frozenAt && row.snapshot));
		assert.equal(report.frozen, 0);
		assert.equal(
			reads[3]!.body.data.frozenAt,
			rows.find(row => row.year === 2025)!.frozenAt!.toISOString()
		);
		assert.deepEqual(reads[3]!.body.data.otherYears, [2026]);
	});

	void it("leaves a year without public runs at the close out of the visitor list, even if they turn public", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(player, games.hades, platform, {
			finishedAt: "2026-03-10",
			isPublic: false
		});
		await addRun(player, games.tunic, platform, {
			finishedAt: "2025-05-05",
			isPublic: true
		});
		await generate(player, 2026).expect(201);
		await closeEdition(2026);
		await freezeClosedRewindEditions();
		await Backlog.update(
			{ isPublic: true },
			{ where: { userId: player.user.id } }
		);

		const visitor = await readRewindYears(player.user.username).expect(200);
		const owner = await readRewindYears(
			player.user.username,
			player.authorization
		).expect(200);

		assert.deepEqual(summariesOf(visitor), []);
		assert.deepEqual(
			summariesOf(owner).map(summary => summary.year),
			[2026, 2025]
		);
		assert.equal(summariesOf(owner)[0]?.finishedCount, 1);
	});

	void it("goes back to live numbers when a previous year is regenerated in a later edition", async () => {
		mockPremiumGeneration();
		const player = await premiumPlayerWithTwoYears();
		await generateBothAndFreeze(player);
		await addRun(player, games.celeste, platform, {
			finishedAt: "2026-07-07"
		});
		await createRewindEdition(2027, {
			opensAt: "2026-12-15",
			closesAt: "2026-12-31",
			graceStartsAt: "2026-12-15",
			graceEndsAt: "2026-12-15",
			premiumRegenerations: 1
		});
		const frozenList = await readRewindYears(player.user.username);
		const frozen = await findRewindRow(player, 2026);

		await generate(
			player,
			2026,
			regenerationOf(frozen!.generatedAt.toISOString())
		).expect(200);
		const liveList = await readRewindYears(player.user.username);

		assert.equal(summariesOf(frozenList)[0]?.finishedCount, 1);
		assert.deepEqual(summariesOf(liveList)[0], {
			year: 2026,
			isGenerated: true,
			finishedCount: 2,
			covers: ["Celeste", "Hades"]
		});
		assert.equal(summariesOf(liveList)[1]?.finishedCount, 1);
	});
});

void describe("the persona of a frozen Rewind", () => {
	void it("follows the current access of the visitor to the platinums, in the Rewind and in the list", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await player.user.update({ platinumVisibility: "public" });
		await addRun(player, games.hades, platform, {
			finishedAt: "2026-03-10"
		});
		await giveThreePlatinums(player);
		await generate(player, 2026).expect(201);
		await closeEdition(2026);
		await freezeClosedRewindEditions();
		const row = await findRewindRow(player, 2026);

		const publicPlatinums = await Promise.all([
			readRewind(player.user.username, 2026),
			readRewindYears(player.user.username)
		]);
		await player.user.update({ platinumVisibility: "private" });
		const [hiddenRewind, hiddenList, ownRewind, ownList] =
			await Promise.all([
				readRewind(player.user.username, 2026),
				readRewindYears(player.user.username),
				readRewind(player.user.username, 2026, player.authorization),
				readRewindYears(player.user.username, player.authorization)
			]);
		await player.user.update({ platinumVisibility: "public" });
		const shownAgain = await readRewind(player.user.username, 2026);

		const withoutPlatinums = row!.snapshot!.public!.personaWithoutPlatinums;
		assert.equal(row?.snapshot?.public?.persona, "trophy-hunter");
		assert.notEqual(withoutPlatinums, "trophy-hunter");
		assert.equal(publicPlatinums[0].body.data.persona, "trophy-hunter");
		assert.equal(
			publicPlatinums[1].body.data.years[0].persona,
			"trophy-hunter"
		);
		assert.equal(hiddenRewind.body.data.persona, withoutPlatinums);
		assert.equal(hiddenRewind.body.data.totals.platinums, null);
		assert.equal(hiddenList.body.data.years[0].persona, withoutPlatinums);
		assert.equal(ownRewind.body.data.persona, "trophy-hunter");
		assert.equal(ownList.body.data.years[0].persona, "trophy-hunter");
		assert.equal(shownAgain.body.data.persona, "trophy-hunter");
	});

	void it("matches what the live calculation served before the close", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z");
		await player.user.update({ platinumVisibility: "private" });
		await addRun(player, games.hades, platform, {
			finishedAt: "2026-03-10"
		});
		await giveThreePlatinums(player);
		await generate(player, 2026).expect(201);

		const liveVisitor = await readRewind(player.user.username, 2026);
		const liveOwner = await readRewind(
			player.user.username,
			2026,
			player.authorization
		);
		await closeEdition(2026);
		const frozenVisitor = await readRewind(player.user.username, 2026);
		const frozenOwner = await readRewind(
			player.user.username,
			2026,
			player.authorization
		);

		assert.equal(frozenVisitor.body.data.frozenAt !== null, true);
		assert.equal(
			frozenVisitor.body.data.persona,
			liveVisitor.body.data.persona
		);
		assert.equal(
			frozenOwner.body.data.persona,
			liveOwner.body.data.persona
		);
		assert.deepEqual(
			frozenVisitor.body.data.totals,
			liveVisitor.body.data.totals
		);
	});
});

void describe("the runs behind the snapshot", () => {
	void it("never stores notes, even when the owner fed them to the AI, and keeps private runs out of the visitor view", async () => {
		mockPremiumGeneration();
		const player = await signUpOn("2025-01-15T00:00:00.000Z", "premium");
		await addRun(player, games.hades, platform, {
			finishedAt: "2026-03-10",
			notes: SECRET_NOTE
		});
		await addRun(player, games.celeste, platform, {
			finishedAt: "2026-04-04",
			isPublic: false,
			notes: SECRET_NOTE
		});
		await generate(player, 2026, {
			...FIRST_GENERATION,
			includeNotes: true,
			includePrivateRuns: true
		}).expect(201);
		await closeEdition(2026);
		await freezeClosedRewindEditions();

		const row = await findRewindRow(player, 2026);
		const stored = JSON.stringify(row?.snapshot);

		assert.equal(stored.includes(SECRET_NOTE), false);
		assert.deepEqual(row?.snapshot?.owner.options, {
			includesPrivateRuns: true,
			includesNotes: true
		});
		assert.deepEqual(
			row?.snapshot?.owner.finishedGames.map(game => game.title),
			["Hades", "Celeste"]
		);
		assert.deepEqual(
			row?.snapshot?.public?.finishedGames.map(game => game.title),
			["Hades"]
		);
	});
});
