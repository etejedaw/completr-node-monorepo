import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import {
	type Rewind as RewindResponse,
	type RewindYearSummary
} from "../../src/rewind/rewind.interface";
import { Rewind } from "../../src/rewind/rewind.model";
import { freezeRewind } from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import * as rewindEditionsService from "../../src/rewind-editions/services/rewind-editions.service";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createGame,
	createPlatform,
	createRewindEdition
} from "../helpers/factories.helper";
import {
	type Account,
	addRun,
	AI_RECAP,
	findRewindRow,
	generate,
	openRewindEdition2026,
	PREMIUM_STATS,
	readRewind,
	readRewindYears,
	regenerationOf,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

const ACCOUNT_OF_2026 = "2026-03-01T00:00:00.000Z";
const ACCOUNT_OF_2024 = "2024-05-01T00:00:00.000Z";

let platform: Platform;
let games: Record<"hades" | "secret" | "tunic", Game>;

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		secret: await createGame({ title: "Secret" }),
		tunic: await createGame({ title: "Tunic" })
	};
});

beforeEach(async () => {
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
	await createRewindEdition(2025, { design: "2025" });
	await openRewindEdition2026();
});

async function playerWith2025Runs(signedUpAt: string) {
	const player = await signUpOn(signedUpAt, "premium");
	await addRun(player, games.hades, platform, {
		startedAt: "2025-02-01",
		finishedAt: "2025-03-10",
		realDuration: 20
	});
	await addRun(player, games.secret, platform, {
		finishedAt: "2025-05-05",
		realDuration: 50,
		isPublic: false
	});
	await addRun(player, games.tunic, platform, {
		finishedAt: "2026-06-06",
		realDuration: 12
	});
	return player;
}

async function frozenRewindOf2025(
	player: Account,
	fields: Partial<Rewind> = {}
) {
	const edition = await rewindEditionsService.findRewindEditionByYear(2025);
	assert.ok(edition, "the 2025 edition should exist");
	const row = await storeRewind(player, 2025, {
		premiumAccessKind: "premium",
		regenerationsLeft: 2,
		aiRecap: AI_RECAP,
		aiRecapStatus: "ready",
		premiumStats: PREMIUM_STATS,
		...fields
	});
	const outcome = await freezeRewind(row.id, edition);
	assert.equal(outcome.kind, "frozen");
	await row.reload();
	return row;
}

function yearsOf(response: { body: { data: unknown } }) {
	const data = response.body.data as { years: RewindYearSummary[] };
	return data.years.map(summary => summary.year);
}

function rewindOf(response: { body: { data: unknown } }) {
	return response.body.data as RewindResponse;
}

function ownerRewind(player: Account) {
	return readRewind(player.user.username, 2025, player.authorization);
}

void describe("a frozen Rewind of a year before the account", () => {
	void it("is listed and shown to its owner and to visitors with its edition's design", async () => {
		const player = await playerWith2025Runs(ACCOUNT_OF_2026);
		const row = await frozenRewindOf2025(player);

		const [ownerList, visitorList, ownerView, visitorView] =
			await Promise.all([
				readRewindYears(player.user.username, player.authorization),
				readRewindYears(player.user.username),
				ownerRewind(player),
				readRewind(player.user.username, 2025)
			]);

		assert.equal(row.snapshot?.design, "2025");
		assert.ok(row.snapshot?.public, "the visitor snapshot should exist");
		assert.equal(ownerList.status, 200);
		assert.ok(yearsOf(ownerList).includes(2025));
		assert.equal(visitorList.status, 200);
		assert.ok(yearsOf(visitorList).includes(2025));
		assert.equal(ownerView.status, 200);
		assert.equal(visitorView.status, 200);
		assert.equal(rewindOf(ownerView).design, "2025");
		assert.equal(rewindOf(visitorView).design, "2025");
		assert.deepEqual(rewindOf(visitorView).aiRecap, AI_RECAP);
		assert.deepEqual(
			rewindOf(visitorView).finishedGames.map(game => game.title),
			["Hades"]
		);
		assert.deepEqual(
			rewindOf(ownerView)
				.finishedGames.map(game => game.title)
				.sort(),
			["Hades", "Secret"]
		);
	});

	void it("is not offered for regeneration to a premium owner while a later edition is open", async () => {
		const player = await playerWith2025Runs(ACCOUNT_OF_2026);
		await frozenRewindOf2025(player);

		const controls = rewindOf(await ownerRewind(player)).ownerControls;

		assert.equal(controls?.canRegenerate, false);
		assert.equal(controls?.regenerationBlockedBy, "period-closed");
		assert.equal(controls?.aiRecapState, "ready");
	});

	void it("is not offered either while its generation quota is still unassigned", async () => {
		const player = await playerWith2025Runs(ACCOUNT_OF_2026);
		await frozenRewindOf2025(player, {
			premiumAccessKind: null,
			regenerationsLeft: 0
		});

		const controls = rewindOf(await ownerRewind(player)).ownerControls;

		assert.equal(controls?.canRegenerate, false);
		assert.equal(controls?.regenerationBlockedBy, "period-closed");
	});

	void it("refuses repeated regeneration requests without spending or unfreezing anything", async () => {
		const player = await playerWith2025Runs(ACCOUNT_OF_2026);
		const frozen = await frozenRewindOf2025(player);
		const body = regenerationOf(frozen.generatedAt.toISOString());

		const responses = await Promise.all([
			generate(player, 2025, body),
			generate(player, 2025, body),
			generate(player, 2025, { ...body, expectedGeneratedAt: null }),
			generate(player, "2025abc", body)
		]);

		assert.deepEqual(
			responses.map(response => response.status),
			[404, 404, 404, 422]
		);
		const row = await findRewindRow(player, 2025);
		assert.equal(row?.regenerationsLeft, 2);
		assert.equal(row?.graceUsed, false);
		assert.equal(
			row?.frozenAt?.toISOString(),
			frozen.frozenAt?.toISOString()
		);
		assert.equal(
			row?.generatedAt.toISOString(),
			frozen.generatedAt.toISOString()
		);
		assert.deepEqual(row?.snapshot, frozen.snapshot);
	});

	void it("is still offered when the account already existed that year", async () => {
		const player = await playerWith2025Runs(ACCOUNT_OF_2024);
		await frozenRewindOf2025(player);

		const controls = rewindOf(await ownerRewind(player)).ownerControls;

		assert.equal(controls?.canRegenerate, true);
		assert.equal(controls?.regenerationBlockedBy, null);
	});
});
