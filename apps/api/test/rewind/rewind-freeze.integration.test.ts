import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { Backlog } from "../../src/backlog/backlog.model";
import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import * as gamePlatinumService from "../../src/game-platinum/game-platinum.service";
import { type Game } from "../../src/games/game.model";
import {
	runScheduledRewindFreeze,
	startRewindFreezeScheduler
} from "../../src/jobs/rewind-freeze.scheduler";
import { type Platform } from "../../src/platforms/platform.model";
import {
	type RewindStoredHighlights,
	type RewindView
} from "../../src/rewind/rewind.interface";
import { Rewind } from "../../src/rewind/rewind.model";
import * as rewindFreezeService from "../../src/rewind/services/rewind-freeze.service";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import * as rewindEditionsService from "../../src/rewind-editions/services/rewind-editions.service";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import {
	createGame,
	createPlatform,
	createRewindEdition
} from "../helpers/factories.helper";
import {
	CLOSED_TWO_WEEKS_AGO,
	closeEdition,
	deferred,
	findEditionFrozenAt,
	holdFreezeLockWhile
} from "./rewind-freeze.helper";
import {
	type Account,
	addRun,
	AI_RECAP,
	findRewindRow,
	generate,
	mockAiRecap,
	mockPremiumStats,
	openRewindEdition2026,
	readRewind,
	regenerationOf,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

const { freezeClosedRewindEditions, freezeRewind } = rewindFreezeService;

let platform: Platform;
let games: Record<"hades" | "celeste" | "tunic", Game>;

useTestDatabase(async () => {
	platform = await createPlatform();
	games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		tunic: await createGame({ title: "Tunic" })
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

const NOTHING_TO_FREEZE = {
	locked: true,
	closedEditions: [],
	frozenEditions: [],
	frozen: 0,
	pending: 0,
	failed: 0
};

async function playerWithHades(
	role: Account["user"]["role"] = "premium",
	isPublic = true
) {
	const player = await signUpOn("2025-01-15T00:00:00.000Z", role);
	await addRun(player, games.hades, platform, {
		finishedAt: "2026-03-10",
		isPublic
	});
	return player;
}

function mockPremiumGeneration() {
	mockPremiumStats();
	return mockAiRecap();
}

async function generateAndClose(player: Account) {
	const response = await generate(player, 2026).expect(201);
	await closeEdition(2026);
	return response;
}

function finishedTitles(response: { body: { data: unknown } }) {
	const data = response.body.data as { finishedGames: { title: string }[] };
	return data.finishedGames.map(game => game.title);
}

function abandonedTitles(response: { body: { data: unknown } }) {
	const data = response.body.data as { abandonedGames: { title: string }[] };
	return data.abandonedGames.map(game => game.title);
}

function withoutAbandoned(view: RewindView): RewindView {
	const photo = { ...view };
	delete photo.abandonedGames;
	return photo;
}

function withoutClassic(view: RewindView): RewindView {
	const highlights: RewindStoredHighlights = { ...view.highlights };
	delete highlights.classic;
	return { ...view, highlights };
}

async function requireEdition(year: number) {
	const edition = await rewindEditionsService.findRewindEditionByYear(year);
	assert.ok(edition);
	return edition;
}

void describe("freezing a closed edition", () => {
	void it("freezes each live Rewind once, marks the edition and changes nothing on the next runs", async () => {
		mockPremiumGeneration();
		const player = await playerWithHades();
		await generateAndClose(player);

		const first = await freezeClosedRewindEditions();
		const row = await findRewindRow(player, 2026);
		const editionFrozenAt = await findEditionFrozenAt(2026);
		const second = await freezeClosedRewindEditions();
		const again = await freezeRewind(row!.id, await requireEdition(2026));

		assert.deepEqual(first, {
			...NOTHING_TO_FREEZE,
			closedEditions: [2026],
			frozenEditions: [2026],
			frozen: 1
		});
		assert.deepEqual(second, NOTHING_TO_FREEZE);
		assert.equal(again.kind, "already-frozen");
		assert.ok(row?.frozenAt && row.snapshot && editionFrozenAt);
		assert.equal(row.snapshot.schemaVersion, 1);
		assert.equal(row.snapshot.design, "2026");
		assert.equal(row.snapshot.frozenAt, row.frozenAt.toISOString());
		assert.deepEqual(row.snapshot.owner.aiRecap, AI_RECAP);
		assert.equal(row.snapshot.owner.finishedGames[0]?.title, "Hades");
		assert.equal(row.snapshot.public?.finishedGames[0]?.title, "Hades");
		const after = await findRewindRow(player, 2026);
		assert.equal(after?.frozenAt?.getTime(), row.frozenAt.getTime());
		assert.deepEqual(after?.snapshot, row.snapshot);
		assert.equal(
			(await findEditionFrozenAt(2026))?.getTime(),
			editionFrozenAt.getTime()
		);
	});

	void it("lets a second process skip while the lock is held and marks the edition only once with simultaneous runs", async () => {
		const players = [
			await playerWithHades("user"),
			await playerWithHades("user"),
			await playerWithHades("user")
		];
		for (const player of players) await generate(player, 2026).expect(201);
		await closeEdition(2026);

		const blocked = await holdFreezeLockWhile(() =>
			freezeClosedRewindEditions()
		);
		const untouched = await Rewind.count({ where: { frozenAt: null } });
		const reports = await Promise.all([
			freezeClosedRewindEditions(),
			freezeClosedRewindEditions(),
			freezeClosedRewindEditions()
		]);

		assert.deepEqual(blocked, { ...NOTHING_TO_FREEZE, locked: false });
		assert.equal(untouched, 3);
		assert.equal(
			reports.reduce((sum, report) => sum + report.frozen, 0),
			3
		);
		assert.equal(
			reports.filter(report => report.frozenEditions.includes(2026))
				.length,
			1
		);
		assert.ok(reports.every(report => report.failed === 0));
		assert.equal(await Rewind.count({ where: { frozenAt: null } }), 0);
	});

	void it("waits for a regeneration that entered at the border of closing and freezes it with its new recap", async () => {
		mockPremiumStats();
		const player = await playerWithHades();
		mockAiRecap();
		const first = await generate(player, 2026).expect(201);
		mock.restoreAll();
		mockPremiumStats();
		const gate = deferred<undefined>();
		mockAiRecap(async () => {
			await gate.promise;
			return { ...AI_RECAP, headline: "The second take" };
		});

		const regenerating = generate(
			player,
			2026,
			regenerationOf(first.body.data.generatedAt)
		).then(response => response);
		await eventually(async () => {
			const row = await findRewindRow(player, 2026);
			assert.equal(row?.aiRecapStatus, "pending");
		});
		await closeEdition(2026);
		const whilePending = await freezeClosedRewindEditions();
		const visitorWhilePending = await readRewind(
			player.user.username,
			2026
		).expect(200);
		gate.resolve(undefined);
		const regenerated = await regenerating;
		const afterRecap = await freezeClosedRewindEditions();

		assert.deepEqual(whilePending, {
			...NOTHING_TO_FREEZE,
			closedEditions: [2026],
			pending: 1
		});
		assert.equal(visitorWhilePending.body.data.frozenAt, null);
		assert.equal(regenerated.status, 200);
		assert.deepEqual(afterRecap.frozenEditions, [2026]);
		const row = await findRewindRow(player, 2026);
		assert.ok(row?.frozenAt);
		assert.equal(row.snapshot?.owner.aiRecap?.headline, "The second take");
		assert.equal(row.regenerationsLeft, 0);
	});

	void it("freezes what the API missed while it was down as soon as the scheduler starts", async () => {
		const player = await playerWithHades("user");
		await storeRewind(player, 2026);
		await closeEdition(2026, CLOSED_TWO_WEEKS_AGO);

		const scheduler = startRewindFreezeScheduler();
		try {
			await eventually(async () => {
				assert.ok(await findEditionFrozenAt(2026));
			});
		} finally {
			scheduler.stop();
		}

		const row = await findRewindRow(player, 2026);
		assert.ok(row?.frozenAt && row.snapshot);
		assert.equal(row.snapshot.owner.totals.finished, 1);
	});

	void it("logs a failed scheduled run without throwing", async () => {
		mock.method(rewindFreezeService, "freezeClosedRewindEditions", () =>
			Promise.reject(new Error("database went away"))
		);

		await assert.doesNotReject(runScheduledRewindFreeze());
	});

	void it("never freezes Rewinds of an open edition when an older edition was left unfrozen", async () => {
		const player = await playerWithHades("user");
		await generate(player, 2026).expect(201);
		await createRewindEdition(2025, {
			opensAt: "2025-12-01",
			closesAt: "2026-01-31",
			graceStartsAt: "2026-01-01",
			graceEndsAt: "2026-01-07"
		});

		const report = await freezeClosedRewindEditions();
		const read = await readRewind(player.user.username, 2026).expect(200);

		assert.deepEqual(report, {
			...NOTHING_TO_FREEZE,
			closedEditions: [2025],
			frozenEditions: [2025]
		});
		assert.equal((await findRewindRow(player, 2026))?.frozenAt, null);
		assert.equal(read.body.data.frozenAt, null);
		assert.equal(await findEditionFrozenAt(2026), null);
	});

	void it("rebuilds the photo when the row changes while it is being built, and gives up after the last attempt", async () => {
		const player = await playerWithHades("user");
		await generate(player, 2026).expect(201);
		await closeEdition(2026);
		const row = await findRewindRow(player, 2026);
		const edition = await requireEdition(2026);
		const countPlatinums =
			gamePlatinumService.countPlatinumsByUserIdAndYear;
		let calls = 0;
		const platinumsMock = mock.method(
			gamePlatinumService,
			"countPlatinumsByUserIdAndYear",
			async (userId: string, year: number) => {
				calls++;
				if (calls === 1)
					await Rewind.update(
						{ language: "es" },
						{ where: { id: row!.id } }
					);
				return countPlatinums(userId, year);
			}
		);

		const rebuilt = await freezeRewind(row!.id, edition);
		platinumsMock.mock.restore();
		const restless = await findRewindRow(player, 2026);
		const rebuiltLanguage = restless?.snapshot?.owner.language;
		await restless!.update({ frozenAt: null, snapshot: null });
		mock.method(
			gamePlatinumService,
			"countPlatinumsByUserIdAndYear",
			async (userId: string, year: number) => {
				await Rewind.update(
					{ language: calls++ % 2 === 0 ? "en" : "es" },
					{ where: { id: row!.id } }
				);
				return countPlatinums(userId, year);
			}
		);
		const gaveUp = await freezeRewind(row!.id, edition);

		assert.equal(rebuilt.kind, "frozen");
		assert.equal(rebuiltLanguage, "es");
		assert.equal(gaveUp.kind, "pending");
		assert.equal((await findRewindRow(player, 2026))?.frozenAt, null);
	});

	void it("leaves the edition unmarked when a Rewind fails to freeze and retries on the next run", async () => {
		const player = await playerWithHades("user");
		await generate(player, 2026).expect(201);
		await closeEdition(2026);
		const snapshotMock = mock.method(
			gamePlatinumService,
			"countPlatinumsByUserIdAndYear",
			() => Promise.reject(new Error("boom"))
		);

		const failed = await freezeClosedRewindEditions();
		const editionAfterFailure = await findEditionFrozenAt(2026);
		snapshotMock.mock.restore();
		const retried = await freezeClosedRewindEditions();

		assert.deepEqual(failed, {
			...NOTHING_TO_FREEZE,
			closedEditions: [2026],
			failed: 1
		});
		assert.equal(editionAfterFailure, null);
		assert.ok(retried.frozenEditions.includes(2026));
		assert.ok((await findRewindRow(player, 2026))?.frozenAt);
	});
});

void describe("reading a frozen Rewind", () => {
	void it("freezes on the first read when the job has not run yet, for owner and visitors alike", async () => {
		const player = await playerWithHades("user");
		await generateAndClose(player);

		const reads = await Promise.all([
			readRewind(player.user.username, 2026),
			readRewind(player.user.username, 2026),
			readRewind(player.user.username, 2026, player.authorization)
		]);
		const row = await findRewindRow(player, 2026);

		assert.ok(row?.frozenAt);
		for (const read of reads) {
			assert.equal(read.status, 200);
			assert.equal(read.body.data.frozenAt, row.frozenAt.toISOString());
		}
		assert.equal(
			reads[2]!.body.data.ownerControls.frozenAt,
			row.frozenAt.toISOString()
		);
		assert.equal(reads[0]!.body.data.ownerControls, null);
	});

	void it("keeps a run that turned private after closing in the photo and leaves new runs out", async () => {
		const player = await playerWithHades("user");
		await generateAndClose(player);
		await freezeClosedRewindEditions();

		await Backlog.update(
			{ isPublic: false },
			{ where: { userId: player.user.id } }
		);
		await addRun(player, games.celeste, platform, {
			finishedAt: "2026-09-09"
		});
		const visitor = await readRewind(player.user.username, 2026).expect(
			200
		);
		const owner = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);

		assert.deepEqual(finishedTitles(visitor), ["Hades"]);
		assert.equal(visitor.body.data.totals.finished, 1);
		assert.deepEqual(finishedTitles(owner), ["Hades"]);
		assert.equal(owner.body.data.totals.finished, 1);
	});

	void it("keeps a year that only had private runs at closing hidden from visitors, even if they turn public", async () => {
		const player = await playerWithHades("user", false);
		await generateAndClose(player);
		await freezeClosedRewindEditions();

		await Backlog.update(
			{ isPublic: true },
			{ where: { userId: player.user.id } }
		);
		const visitor = await readRewind(player.user.username, 2026);
		const owner = await readRewind(
			player.user.username,
			2026,
			player.authorization
		).expect(200);

		assert.equal(visitor.status, 404);
		assert.equal(visitor.body.type, "REWIND_NOT_FOUND");
		assert.equal(
			(await findRewindRow(player, 2026))?.snapshot?.public,
			null
		);
		assert.deepEqual(finishedTitles(owner), ["Hades"]);
	});

	void it("keeps access to the sections live: hiding the platinums or the Rewind applies to the photo", async () => {
		const player = await playerWithHades("user");
		await player.user.update({ platinumVisibility: "public" });
		await GamePlatinum.create({
			userId: player.user.id,
			gameId: games.hades.id,
			platinumedAt: "2026-03-11"
		});
		await generateAndClose(player);
		await freezeClosedRewindEditions();

		const withPlatinums = await readRewind(player.user.username, 2026);
		await player.user.update({ platinumVisibility: "private" });
		const withoutPlatinums = await readRewind(player.user.username, 2026);
		const ownerView = await readRewind(
			player.user.username,
			2026,
			player.authorization
		);
		await player.user.update({ rewindVisibility: "private" });
		const hidden = await readRewind(player.user.username, 2026);

		assert.equal(withPlatinums.body.data.totals.platinums, 1);
		assert.equal(withoutPlatinums.status, 200);
		assert.equal(withoutPlatinums.body.data.totals.platinums, null);
		assert.equal(ownerView.body.data.totals.platinums, 1);
		assert.equal(hidden.status, 403);
		assert.equal(hidden.body.type, "USER_PRIVATE");
	});

	void it("freezes the classic into the photo and reads a photo frozen before it existed as one without it", async () => {
		const player = await signUpOn("2025-01-15T00:00:00.000Z", "user");
		const doom = await createGame({ title: "Doom" });
		await doom.update({ releaseAt: new Date("1993-12-10") });
		await addRun(player, doom, platform, { finishedAt: "2026-03-10" });
		await generateAndClose(player);
		await freezeClosedRewindEditions();

		const row = await findRewindRow(player, 2026);
		assert.ok(row?.snapshot?.public);
		assert.equal(row.snapshot.owner.highlights.classic?.releaseYear, 1993);
		for (const read of [
			await readRewind(player.user.username, 2026),
			await readRewind(player.user.username, 2026, player.authorization)
		]) {
			assert.equal(read.status, 200);
			assert.equal(read.body.data.highlights.classic.title, "Doom");
			assert.equal(read.body.data.highlights.classic.releaseYear, 1993);
		}

		const { owner, public: visitor } = row.snapshot;
		await row.update({
			snapshot: {
				...row.snapshot,
				owner: withoutClassic(owner),
				public: withoutClassic(visitor)
			}
		});
		const reads = await Promise.all([
			readRewind(player.user.username, 2026),
			readRewind(player.user.username, 2026, player.authorization)
		]);

		for (const read of reads) {
			assert.equal(read.status, 200);
			assert.equal(read.body.data.highlights.classic, null);
			assert.deepEqual(finishedTitles(read), ["Doom"]);
		}
	});

	void it("freezes the abandoned games into each photo with its privacy and reads a photo frozen before they existed as none", async () => {
		const player = await playerWithHades("user");
		await addRun(player, games.tunic, platform, {
			status: "abandoned",
			finishedAt: "2026-05-05"
		});
		await addRun(player, games.celeste, platform, {
			status: "abandoned",
			finishedAt: "2026-06-06",
			isPublic: false
		});
		await generateAndClose(player);
		await freezeClosedRewindEditions();

		const row = await findRewindRow(player, 2026);
		assert.ok(row?.snapshot?.public);
		assert.deepEqual(
			row.snapshot.owner.abandonedGames?.map(game => game.title),
			["Tunic", "Celeste"]
		);
		assert.deepEqual(
			row.snapshot.public.abandonedGames?.map(game => game.title),
			["Tunic"]
		);

		await Backlog.update(
			{ isPublic: false },
			{ where: { userId: player.user.id } }
		);
		await addRun(player, games.hades, platform, {
			status: "abandoned",
			finishedAt: "2026-11-11"
		});
		const [visitor, owner] = await Promise.all([
			readRewind(player.user.username, 2026).expect(200),
			readRewind(player.user.username, 2026, player.authorization).expect(
				200
			)
		]);
		assert.deepEqual(abandonedTitles(visitor), ["Tunic"]);
		assert.deepEqual(abandonedTitles(owner), ["Tunic", "Celeste"]);
		assert.equal(owner.body.data.totals.abandoned, 2);

		const { owner: ownerPhoto, public: visitorPhoto } = row.snapshot;
		await row.update({
			snapshot: {
				...row.snapshot,
				owner: withoutAbandoned(ownerPhoto),
				public: withoutAbandoned(visitorPhoto)
			}
		});
		const reads = await Promise.all([
			readRewind(player.user.username, 2026),
			readRewind(player.user.username, 2026, player.authorization)
		]);

		for (const read of reads) {
			assert.equal(read.status, 200);
			assert.deepEqual(read.body.data.abandonedGames, []);
			assert.deepEqual(finishedTitles(read), ["Hades"]);
		}
	});

	void it("answers 404 to garbage years on a frozen account and keeps the other years live", async () => {
		const player = await playerWithHades("user");
		await addRun(player, games.tunic, platform, {
			finishedAt: "2025-05-05"
		});
		await generateAndClose(player);
		await freezeClosedRewindEditions();

		const garbage = await readRewind(player.user.username, "20x6");
		const ungenerated = await readRewind(player.user.username, 2025);
		const frozen = await readRewind(player.user.username, 2026).expect(200);

		assert.equal(garbage.status, 422);
		assert.equal(ungenerated.status, 404);
		assert.deepEqual(frozen.body.data.otherYears, []);
	});
});

void describe("regenerating a frozen previous year in a later edition", () => {
	void it("unfreezes it with the design of the new edition and freezes it again when that edition closes", async () => {
		mockPremiumGeneration();
		const player = await playerWithHades();
		await generateAndClose(player);
		await freezeClosedRewindEditions();
		const frozen = await findRewindRow(player, 2026);
		await createRewindEdition(2027, {
			opensAt: "2026-12-15",
			closesAt: "2026-12-31",
			graceStartsAt: "2026-12-15",
			graceEndsAt: "2026-12-15",
			design: "next",
			premiumRegenerations: 3
		});

		const beforeRegenerating = await readRewind(
			player.user.username,
			2026
		).expect(200);
		const [regenerated, doubleClick] = await Promise.all([
			generate(
				player,
				2026,
				regenerationOf(frozen!.generatedAt.toISOString())
			),
			generate(
				player,
				2026,
				regenerationOf(frozen!.generatedAt.toISOString())
			)
		]);
		const live = await findRewindRow(player, 2026);
		await addRun(player, games.celeste, platform, {
			finishedAt: "2026-10-10"
		});
		await closeEdition(2027, {
			opensAt: "2026-12-14",
			closesAt: "2026-12-14",
			graceStartsAt: "2026-12-14",
			graceEndsAt: "2026-12-14"
		});
		const report = await freezeClosedRewindEditions();
		const refrozen = await findRewindRow(player, 2026);

		assert.equal(beforeRegenerating.body.data.design, "2026");
		assert.equal(
			beforeRegenerating.body.data.frozenAt,
			frozen!.frozenAt!.toISOString()
		);
		const statuses = [regenerated.status, doubleClick.status].sort();
		assert.deepEqual(statuses, [200, 409]);
		const winner = regenerated.status === 200 ? regenerated : doubleClick;
		assert.equal(winner.body.data.frozenAt, null);
		assert.equal(winner.body.data.design, "next");
		assert.equal(live?.snapshot, null);
		assert.equal(live?.frozenAt, null);
		assert.equal(live?.regenerationsLeft, frozen!.regenerationsLeft - 1);
		assert.deepEqual(report.frozenEditions, [2027]);
		assert.equal(report.frozen, 1);
		assert.ok(refrozen?.frozenAt);
		assert.equal(refrozen.snapshot?.design, "next");
		assert.equal(refrozen.snapshot?.owner.totals.finished, 2);
	});
});
