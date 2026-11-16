import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import {
	type Rewind as RewindResponse,
	type RewindYearSummary
} from "../../src/rewind/rewind.interface";
import { Rewind } from "../../src/rewind/rewind.model";
import { generateClosedEditionRewind } from "../../src/rewind/services/rewind-closed-edition.service";
import { freezeRewind } from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import * as rewindEditionsService from "../../src/rewind-editions/services/rewind-editions.service";
import { type RewindRecapInput } from "../../src/rewind-recap/rewind-recap.interface";
import { User } from "../../src/users/user.model";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createRewindEdition
} from "../helpers/factories.helper";
import { deferred } from "./rewind-freeze.helper";
import {
	type Account,
	addRun,
	AI_RECAP,
	findRewindRow,
	generate,
	mockAiRecap,
	mockPremiumStats,
	openRewindEdition2026,
	PREMIUM_STATS,
	readRewind,
	readRewindYears,
	regenerationOf,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

const PUBLIC_NOTE = "PUBLIC-NOTE finished it on the train";
const PRIVATE_NOTE = "PRIVATE-NOTE played it while off sick";
const NOTE_MARKERS = /PUBLIC-NOTE|PRIVATE-NOTE/;
const HAND_INSERTED_AT = new Date("2026-12-05T09:00:00.000Z");

let platform: Platform;
let games: Record<"hades" | "celeste" | "secret" | "tunic", Game>;

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		secret: await createGame({ title: "Secret" }),
		tunic: await createGame({ title: "Tunic" })
	};
});

beforeEach(async () => {
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
	await createRewindEdition(2025);
	await openRewindEdition2026();
});

afterEach(() => {
	mock.restoreAll();
});

async function playerOf2025(
	role: Account["user"]["role"] = "premium",
	signedUpAt = "2026-03-01T00:00:00.000Z"
) {
	const player = await signUpOn(signedUpAt, role);
	await addRun(player, games.hades, platform, {
		startedAt: "2025-02-01",
		finishedAt: "2025-03-10",
		realDuration: 20,
		notes: PUBLIC_NOTE
	});
	await addRun(player, games.secret, platform, {
		startedAt: "2025-04-01",
		finishedAt: "2025-05-05",
		realDuration: 50,
		isPublic: false,
		notes: PRIVATE_NOTE
	});
	await addRun(player, games.tunic, platform, {
		finishedAt: "2026-06-06",
		realDuration: 12
	});
	return player;
}

function insertRow(player: Account, fields: Partial<Rewind> = {}) {
	return storeRewind(player, 2025, {
		generatedAt: HAND_INSERTED_AT,
		premiumAccessKind: "premium",
		regenerationsLeft: 1,
		...fields
	});
}

function runScript(
	player: Account,
	options: { force?: boolean; skipAi?: boolean; year?: number } = {}
) {
	return generateClosedEditionRewind({
		username: player.user.username,
		year: options.year ?? 2025,
		force: options.force ?? false,
		skipAi: options.skipAi ?? false
	});
}

function mockPremiumGeneration() {
	mockPremiumStats();
	return mockAiRecap();
}

function mockAiOutage() {
	mockPremiumStats();
	return mockAiRecap(() => Promise.reject(new Error("provider down")));
}

async function requireRow(player: Account) {
	const row = await findRewindRow(player, 2025);
	assert.ok(row, "the 2025 Rewind row should exist");
	return row;
}

async function editionDesign(year: number) {
	const edition = await rewindEditionsService.findRewindEditionByYear(year);
	assert.ok(edition, `the ${year} edition should exist`);
	return edition.design;
}

function recapInputOf(aiMock: ReturnType<typeof mockAiRecap>, index = 0) {
	return aiMock.mock.calls[index]?.arguments[0] as RewindRecapInput;
}

function yearsOf(response: { body: { data: unknown } }) {
	const data = response.body.data as { years: RewindYearSummary[] };
	return data.years.map(summary => summary.year);
}

function rewindOf(response: { body: { data: unknown } }) {
	return response.body.data as RewindResponse;
}

void describe("generating the Rewind of a closed edition", () => {
	void it("writes the AI recap and premium stats and freezes it with that year's edition, spending nothing", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player, { graceUsed: true, language: "es" });

		const outcome = await runScript(player);

		assert.equal(outcome.kind, "frozen");
		assert.ok(outcome.kind === "frozen");
		assert.equal(outcome.aiRecapReady, true);
		assert.equal(outcome.design, await editionDesign(2025));
		const row = await requireRow(player);
		assert.equal(row.aiRecapStatus, "ready");
		assert.deepEqual(row.aiRecap, AI_RECAP);
		assert.deepEqual(row.premiumStats, PREMIUM_STATS);
		assert.equal(row.regenerationsLeft, 1);
		assert.equal(row.graceUsed, true);
		assert.equal(
			row.generatedAt.toISOString(),
			HAND_INSERTED_AT.toISOString()
		);
		assert.equal(
			row.frozenAt?.toISOString(),
			outcome.frozenAt.toISOString()
		);
		assert.equal(row.snapshot?.design, await editionDesign(2025));
		assert.equal(row.snapshot?.owner.year, 2025);
		assert.equal(row.snapshot?.owner.design, await editionDesign(2025));
		assert.deepEqual(row.snapshot?.owner.aiRecap, AI_RECAP);
		assert.equal(aiMock.mock.callCount(), 1);
		const input = recapInputOf(aiMock);
		assert.equal(input.year, 2025);
		assert.equal(input.language, "es");
		assert.equal(input.previousYearTotals, null);
	});

	void it("lists the frozen Rewind to its owner and to visitors although the account was created the year after", async () => {
		mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player);
		await runScript(player);

		const [ownerList, visitorList, ownerRewind, visitorRewind] =
			await Promise.all([
				readRewindYears(player.user.username, player.authorization),
				readRewindYears(player.user.username),
				readRewind(player.user.username, 2025, player.authorization),
				readRewind(player.user.username, 2025)
			]);

		assert.equal(ownerList.status, 200);
		assert.ok(yearsOf(ownerList).includes(2025));
		assert.equal(visitorList.status, 200);
		assert.ok(yearsOf(visitorList).includes(2025));
		assert.equal(ownerRewind.status, 200);
		assert.equal(visitorRewind.status, 200);
		assert.equal(rewindOf(ownerRewind).design, await editionDesign(2025));
		assert.equal(rewindOf(visitorRewind).design, await editionDesign(2025));
		assert.deepEqual(rewindOf(visitorRewind).aiRecap, AI_RECAP);
		assert.deepEqual(
			rewindOf(visitorRewind).finishedGames.map(game => game.title),
			["Hades"]
		);
	});

	void it("refuses when the user, the row or the edition is missing, without calling the AI", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		const deactivated = await playerOf2025();
		await insertRow(deactivated);
		await User.update(
			{ isActive: false },
			{ where: { id: deactivated.user.id } }
		);

		const outcomes = await Promise.all([
			generateClosedEditionRewind({
				username: "nobody-here",
				year: 2025,
				force: false,
				skipAi: false
			}),
			generateClosedEditionRewind({
				username: "",
				year: 2025,
				force: true,
				skipAi: true
			}),
			runScript(deactivated),
			runScript(player),
			runScript(player, { year: 2024 })
		]);

		assert.deepEqual(outcomes, [
			{ kind: "refused", reason: "user-missing" },
			{ kind: "refused", reason: "user-missing" },
			{ kind: "refused", reason: "user-missing" },
			{ kind: "refused", reason: "rewind-missing" },
			{ kind: "refused", reason: "edition-missing" }
		]);
		assert.equal(aiMock.mock.callCount(), 0);
		const deactivatedRow = await findRewindRow(deactivated, 2025);
		assert.equal(deactivatedRow?.aiRecapStatus, "none");
		assert.equal(deactivatedRow?.frozenAt, null);
	});

	void it("refuses an open or upcoming edition and leaves the row untouched", async () => {
		const aiMock = mockPremiumGeneration();
		await createRewindEdition(2027, {
			opensAt: "2027-12-01",
			closesAt: "2028-01-31",
			graceStartsAt: "2028-01-01",
			graceEndsAt: "2028-01-07"
		});
		const player = await playerOf2025();
		const open = await storeRewind(player, 2026, {
			premiumAccessKind: "premium"
		});
		await storeRewind(player, 2027, { premiumAccessKind: "premium" });

		const outcomes = await Promise.all([
			runScript(player, { year: 2026, force: true, skipAi: true }),
			runScript(player, { year: 2027, force: true, skipAi: true })
		]);

		assert.deepEqual(outcomes, [
			{ kind: "refused", reason: "edition-not-closed" },
			{ kind: "refused", reason: "edition-not-closed" }
		]);
		assert.equal(aiMock.mock.callCount(), 0);
		await open.reload();
		assert.equal(open.aiRecapStatus, "none");
		assert.equal(open.frozenAt, null);
		assert.equal(open.premiumStats, null);
	});
});

void describe("running it again on a frozen Rewind", () => {
	void it("refuses without --force and keeps the first snapshot", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player);
		await runScript(player);
		const first = await requireRow(player);

		const again = await runScript(player, { skipAi: true });

		assert.deepEqual(again, { kind: "refused", reason: "already-frozen" });
		assert.equal(aiMock.mock.callCount(), 1);
		const row = await requireRow(player);
		assert.equal(
			row.frozenAt?.toISOString(),
			first.frozenAt?.toISOString()
		);
		assert.deepEqual(row.snapshot, first.snapshot);
	});

	void it("rebuilds and refreezes with --force, also after the freezer froze it on its own", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		const row = await insertRow(player);
		const latestEdition =
			await rewindEditionsService.findRewindEditionByYear(2026);
		assert.ok(latestEdition);
		const autoFrozenAt = new Date("2026-12-06T00:00:00.000Z");
		await freezeRewind(row.id, latestEdition, autoFrozenAt);
		await row.reload();
		assert.equal(row.frozenAt?.toISOString(), autoFrozenAt.toISOString());
		assert.equal(row.aiRecap, null);

		const outcome = await runScript(player, { force: true });

		assert.equal(outcome.kind, "frozen");
		await row.reload();
		assert.ok(row.frozenAt);
		assert.notEqual(row.frozenAt.toISOString(), autoFrozenAt.toISOString());
		assert.deepEqual(row.aiRecap, AI_RECAP);
		assert.deepEqual(row.snapshot?.owner.aiRecap, AI_RECAP);
		assert.equal(row.snapshot?.design, await editionDesign(2025));
		assert.equal(row.regenerationsLeft, 1);
		assert.equal(aiMock.mock.callCount(), 1);
	});
});

void describe("when the AI fails", () => {
	void it("marks the recap as failed, keeps the premium stats and does not freeze or refund", async () => {
		mockAiOutage();
		const player = await playerOf2025();
		await insertRow(player);

		const outcome = await runScript(player);

		assert.deepEqual(outcome, { kind: "ai-failed" });
		const row = await requireRow(player);
		assert.equal(row.aiRecapStatus, "failed");
		assert.equal(row.aiRecap, null);
		assert.deepEqual(row.premiumStats, PREMIUM_STATS);
		assert.equal(row.frozenAt, null);
		assert.equal(row.snapshot, null);
		assert.equal(row.regenerationsLeft, 1);
		assert.equal(row.graceUsed, false);
	});

	void it("freezes without a recap when --skip-ai is passed", async () => {
		mockAiOutage();
		const player = await playerOf2025();
		await insertRow(player);

		const outcome = await runScript(player, { skipAi: true });

		assert.equal(outcome.kind, "frozen");
		assert.ok(outcome.kind === "frozen");
		assert.equal(outcome.aiRecapReady, false);
		assert.equal(outcome.design, await editionDesign(2025));
		const row = await requireRow(player);
		assert.equal(row.aiRecapStatus, "failed");
		assert.equal(row.aiRecap, null);
		assert.deepEqual(row.snapshot?.owner.premiumStats, PREMIUM_STATS);
		assert.equal(row.snapshot?.owner.aiRecap, null);
		assert.equal(row.regenerationsLeft, 1);
	});

	void it("can be retried after a failed run without --force, since nothing was frozen", async () => {
		mockAiOutage();
		const player = await playerOf2025();
		await insertRow(player);
		await runScript(player);
		mock.restoreAll();
		mockPremiumGeneration();

		const outcome = await runScript(player);

		assert.equal(outcome.kind, "frozen");
		const row = await requireRow(player);
		assert.equal(row.aiRecapStatus, "ready");
		assert.deepEqual(row.snapshot?.owner.aiRecap, AI_RECAP);
	});
});

void describe("what the AI is given", () => {
	void it("leaves private runs and notes out when the row does not include them", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player, {
			includesPrivateRuns: false,
			includesNotes: false
		});

		await runScript(player);

		const input = recapInputOf(aiMock);
		assert.equal(input.includesNotes, false);
		assert.ok(!input.runs.some(run => run.gameId === games.secret.id));
		assert.doesNotMatch(JSON.stringify(input), NOTE_MARKERS);
	});

	void it("includes private runs and notes when the row asks for them", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player, {
			includesPrivateRuns: true,
			includesNotes: true
		});

		await runScript(player);

		const input = recapInputOf(aiMock);
		assert.equal(input.includesNotes, true);
		assert.ok(input.runs.some(run => run.gameId === games.secret.id));
		assert.match(JSON.stringify(input), /PUBLIC-NOTE/);
		assert.match(JSON.stringify(input), /PRIVATE-NOTE/);
		const row = await requireRow(player);
		assert.equal(row.snapshot?.public?.finishedGames.length, 1);
		assert.equal(row.snapshot?.owner.finishedGames.length, 2);
	});
});

void describe("running it twice at the same time", () => {
	void it("lets exactly one run write and freeze the Rewind", async () => {
		mockPremiumStats();
		const aiStarted = deferred<null>();
		const gate = deferred<null>();
		const aiMock = mockAiRecap(async () => {
			aiStarted.resolve(null);
			await gate.promise;
			return AI_RECAP;
		});
		const player = await playerOf2025();
		await insertRow(player);

		const first = runScript(player, { force: true });
		await aiStarted.promise;
		const second = await runScript(player, { force: true, skipAi: true });
		gate.resolve(null);
		const outcomes = [await first, second];

		assert.equal(outcomes[0]?.kind, "frozen");
		assert.deepEqual(outcomes[1], {
			kind: "refused",
			reason: "recap-in-progress"
		});
		assert.equal(aiMock.mock.callCount(), 1);
		const row = await requireRow(player);
		assert.equal(row.aiRecapStatus, "ready");
		assert.deepEqual(row.snapshot?.owner.aiRecap, AI_RECAP);
		assert.equal(row.regenerationsLeft, 1);
	});

	void it("ends frozen once when both start together without --force", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player);

		const outcomes = await Promise.all([
			runScript(player),
			runScript(player)
		]);

		const kinds = outcomes.map(outcome => outcome.kind).sort();
		assert.deepEqual(kinds, ["frozen", "refused"]);
		assert.equal(aiMock.mock.callCount(), 1);
		const row = await requireRow(player);
		assert.equal(row.aiRecapStatus, "ready");
		assert.ok(row.frozenAt);
		assert.equal(row.snapshot?.design, await editionDesign(2025));
	});

	void it("takes over a recap left pending by a run that died, but not a fresh one", async () => {
		const aiMock = mockPremiumGeneration();
		const player = await playerOf2025();
		const stale = await playerOf2025();
		await insertRow(player, {
			aiRecapStatus: "pending",
			aiRecapRequestedAt: new Date()
		});
		await insertRow(stale, {
			aiRecapStatus: "pending",
			aiRecapRequestedAt: new Date(Date.now() - 10 * 60 * 1000)
		});

		const [fresh, abandoned] = await Promise.all([
			runScript(player, { force: true }),
			runScript(stale)
		]);

		assert.deepEqual(fresh, {
			kind: "refused",
			reason: "recap-in-progress"
		});
		assert.equal(abandoned.kind, "frozen");
		assert.equal(aiMock.mock.callCount(), 1);
	});
});

void describe("regenerating a Rewind older than the account", () => {
	void it("is not offered to a premium owner while a later edition is open, and the POST refuses it", async () => {
		mockPremiumGeneration();
		const player = await playerOf2025();
		await insertRow(player, { regenerationsLeft: 2 });
		await runScript(player);
		const frozen = await requireRow(player);

		const ownerRewind = await readRewind(
			player.user.username,
			2025,
			player.authorization
		);
		const regeneration = await generate(
			player,
			2025,
			regenerationOf(frozen.generatedAt.toISOString())
		);

		const controls = rewindOf(ownerRewind).ownerControls;
		assert.equal(controls?.canRegenerate, false);
		assert.equal(controls?.regenerationBlockedBy, "period-closed");
		assert.equal(controls?.aiRecapState, "ready");
		assert.equal(regeneration.status, 404);
		const row = await requireRow(player);
		assert.equal(row.regenerationsLeft, 2);
		assert.equal(
			row.frozenAt?.toISOString(),
			frozen.frozenAt?.toISOString()
		);
		assert.deepEqual(row.snapshot, frozen.snapshot);
	});

	void it("is still offered for a frozen Rewind of a year the account already existed", async () => {
		mockPremiumGeneration();
		const player = await playerOf2025(
			"premium",
			"2024-05-01T00:00:00.000Z"
		);
		await insertRow(player, { regenerationsLeft: 2 });
		await runScript(player);

		const ownerRewind = await readRewind(
			player.user.username,
			2025,
			player.authorization
		);

		const controls = rewindOf(ownerRewind).ownerControls;
		assert.equal(controls?.canRegenerate, true);
		assert.equal(controls?.regenerationBlockedBy, null);
	});
});
