import "./rewind-today-env.setup";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { GamePlatinum } from "../../src/game-platinum/game-platinum.model";
import { type Game } from "../../src/games/game.model";
import { type Platform } from "../../src/platforms/platform.model";
import { type RewindPlatinumGame } from "../../src/rewind/rewind.interface";
import { Rewind } from "../../src/rewind/rewind.model";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { type VisibilityLevel } from "../../src/users/constants/visibility.constants";
import { User } from "../../src/users/user.model";
import { api } from "../helpers/app.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame, createPlatform } from "../helpers/factories.helper";
import { closeEdition } from "./rewind-freeze.helper";
import {
	type Account,
	addRun,
	findRewindRow,
	openRewindEdition2026,
	readRewind,
	signUpOn,
	storeRewind
} from "./rewind-generation.helper";

interface OwnerPrivacy {
	profileVisibility: VisibilityLevel;
	rewindVisibility: VisibilityLevel;
	platinumVisibility: VisibilityLevel;
}

interface Fixture {
	owner: Account;
	visitor: Account;
	games: Record<"hades" | "celeste" | "tunic" | "inside" | "outer", Game>;
	platinums: Record<"hades" | "celeste" | "tunic", GamePlatinum>;
}

const OPEN_SECTIONS: OwnerPrivacy = {
	profileVisibility: "public",
	rewindVisibility: "public",
	platinumVisibility: "public"
};

const PLATINUM_GAME_KEYS = [
	"backgroundUrl",
	"code",
	"coverUrl",
	"gameId",
	"platformAbbreviation",
	"platinumedAt",
	"title"
];

const SECRET_NOTE = "secret platinum note";

const PARALLEL_READERS = 8;

let platform: Platform;

useTestDatabase(async () => {
	platform = await createPlatform();
});

beforeEach(async () => {
	await Rewind.destroy({ where: {} });
	await RewindEdition.destroy({ where: {} });
	await openRewindEdition2026();
});

async function setPrivacy(owner: Account, privacy: Partial<OwnerPrivacy>) {
	await User.update(
		{ ...OPEN_SECTIONS, ...privacy },
		{ where: { id: owner.user.id } }
	);
}

function platinumOf(
	owner: Account,
	game: Game,
	fields: Partial<GamePlatinum> = {}
) {
	return GamePlatinum.create({
		userId: owner.user.id,
		gameId: game.id,
		...fields
	});
}

async function seedFixture(): Promise<Fixture> {
	const [owner, visitor] = await Promise.all([
		signUpOn("2025-01-15T00:00:00.000Z"),
		signUpOn("2025-01-15T00:00:00.000Z")
	]);
	const games = {
		hades: await createGame({ title: "Hades" }),
		celeste: await createGame({ title: "Celeste" }),
		tunic: await createGame({ title: "Tunic" }),
		inside: await createGame({ title: "Inside" }),
		outer: await createGame({ title: "Outer Wilds" })
	};
	await addRun(owner, games.hades, platform, { finishedAt: "2026-03-10" });
	const privateRun = await addRun(owner, games.celeste, platform, {
		finishedAt: "2026-07-01",
		isPublic: false
	});
	const platinums = {
		hades: await platinumOf(owner, games.hades, {
			platinumedAt: "2026-02-01"
		}),
		celeste: await platinumOf(owner, games.celeste, {
			platinumedAt: "2026-08-20",
			backlogId: privateRun.id,
			platformId: platform.id,
			notes: SECRET_NOTE
		}),
		tunic: await platinumOf(owner, games.tunic, {
			platinumedAt: "2026-08-20",
			platformId: platform.id
		})
	};
	await platinumOf(owner, games.inside, { platinumedAt: "2025-12-31" });
	await platinumOf(owner, games.outer, { platinumedAt: null });
	await storeRewind(owner, 2026);
	await setPrivacy(owner, {});
	return { owner, visitor, games, platinums };
}

function expectedOrder(fixture: Fixture): string[] {
	const sameDay = [fixture.platinums.celeste, fixture.platinums.tunic]
		.sort((left, right) => left.id.localeCompare(right.id))
		.map(platinum => platinum.gameId);
	return [fixture.games.hades.id, ...sameDay];
}

function platinumGamesOf(response: {
	body: { data: { platinumGames: RewindPlatinumGame[] | null } };
}) {
	return response.body.data.platinumGames;
}

async function readAs(fixture: Fixture, authorization?: string) {
	const response = await readRewind(
		fixture.owner.user.username,
		2026,
		authorization
	).expect(200);
	return response;
}

function assertListMatchesCount(response: {
	body: {
		data: {
			platinumGames: RewindPlatinumGame[] | null;
			totals: { platinums: number | null };
		};
	};
}) {
	const { platinumGames, totals } = response.body.data;
	assert.equal(platinumGames?.length ?? null, totals.platinums);
}

function assertHidden(response: {
	body: {
		data: {
			platinumGames: RewindPlatinumGame[] | null;
			totals: { platinums: number | null };
			persona: string;
		};
	};
}) {
	assert.equal(response.body.data.platinumGames, null);
	assert.equal(response.body.data.totals.platinums, null);
	assert.notEqual(response.body.data.persona, "trophy-hunter");
	assert.equal(JSON.stringify(response.body).includes("Tunic"), false);
	assert.equal(JSON.stringify(response.body).includes("platinumedAt"), false);
}

function upsertPlatinum(account: Account, game: Game, body: object) {
	return api()
		.put(`/users/me/games/${game.id}/platinum`)
		.set("Authorization", account.authorization)
		.send(body);
}

void describe("platinum games of a live Rewind", () => {
	void it("lists the owner's platinums of the year by date, without notes and with the count matching", async () => {
		const fixture = await seedFixture();

		const response = await readAs(fixture, fixture.owner.authorization);
		const platinumGames = platinumGamesOf(response);

		assert.ok(platinumGames);
		assert.deepEqual(
			platinumGames.map(game => game.gameId),
			expectedOrder(fixture)
		);
		assertListMatchesCount(response);
		assert.equal(response.body.data.totals.platinums, 3);
		for (const game of platinumGames)
			assert.deepEqual(Object.keys(game).sort(), PLATINUM_GAME_KEYS);
		const celeste = platinumGames.find(
			game => game.gameId === fixture.games.celeste.id
		);
		assert.deepEqual(celeste, {
			gameId: fixture.games.celeste.id,
			code: fixture.games.celeste.code,
			title: "Celeste",
			coverUrl: fixture.games.celeste.coverUrl ?? null,
			backgroundUrl: fixture.games.celeste.backgroundUrl ?? null,
			platinumedAt: "2026-08-20",
			platformAbbreviation: platform.abbreviation
		});
		assert.equal(platinumGames[0]?.platformAbbreviation, null);
		assert.equal(
			JSON.stringify(response.body).includes(SECRET_NOTE),
			false
		);
	});

	void it("shows the same list to a visitor with access to the profile and the platinums, private runs included like the count", async () => {
		const fixture = await seedFixture();

		const [anonymous, signedIn, owner] = await Promise.all([
			readAs(fixture),
			readAs(fixture, fixture.visitor.authorization),
			readAs(fixture, fixture.owner.authorization)
		]);

		assert.deepEqual(platinumGamesOf(anonymous), platinumGamesOf(owner));
		assert.deepEqual(platinumGamesOf(signedIn), platinumGamesOf(owner));
		assertListMatchesCount(anonymous);
		assert.equal(
			JSON.stringify(anonymous.body).includes(SECRET_NOTE),
			false
		);
	});

	void it("hides the list from a visitor without platinum access while the owner keeps it", async () => {
		const fixture = await seedFixture();
		await setPrivacy(fixture.owner, { platinumVisibility: "private" });

		const visitor = await readAs(fixture, fixture.visitor.authorization);
		const anonymous = await readAs(fixture);
		const owner = await readAs(fixture, fixture.owner.authorization);

		assertHidden(visitor);
		assertHidden(anonymous);
		assert.equal(platinumGamesOf(owner)?.length, 3);
	});

	void it("hides the list when the Rewind opens by link on a private profile", async () => {
		const fixture = await seedFixture();
		await setPrivacy(fixture.owner, { profileVisibility: "private" });

		assertHidden(await readAs(fixture, fixture.visitor.authorization));
		assertHidden(await readAs(fixture));
	});

	void it("serves an empty list, not null, when the year has no platinums", async () => {
		const owner = await signUpOn("2025-01-15T00:00:00.000Z");
		await addRun(owner, await createGame({ title: "Solo" }), platform, {
			finishedAt: "2026-03-10"
		});
		await storeRewind(owner, 2026);
		await setPrivacy(owner, {});

		const response = await readRewind(owner.user.username, 2026).expect(
			200
		);

		assert.deepEqual(response.body.data.platinumGames, []);
		assert.equal(response.body.data.totals.platinums, 0);
	});

	void it("keeps one entry per game when the owner saves the same platinum twice in a row or at once", async () => {
		const fixture = await seedFixture();
		const { owner, games } = fixture;

		const first = await upsertPlatinum(owner, games.inside, {
			platinumedAt: "2026-04-01"
		});
		const second = await upsertPlatinum(owner, games.inside, {
			platinumedAt: "2026-05-05"
		});
		const simultaneous = await Promise.all([
			upsertPlatinum(owner, games.outer, { platinumedAt: "2026-06-01" }),
			upsertPlatinum(owner, games.outer, { platinumedAt: "2026-06-01" })
		]);
		const response = await readAs(fixture, owner.authorization);
		const gameIds = platinumGamesOf(response)?.map(game => game.gameId);

		assert.equal(first.status, 200);
		assert.equal(second.status, 200);
		for (const attempt of simultaneous)
			assert.ok([200, 201, 409].includes(attempt.status));
		assert.equal(gameIds?.filter(id => id === games.inside.id).length, 1);
		assert.equal(gameIds?.filter(id => id === games.outer.id).length, 1);
		assert.equal(
			platinumGamesOf(response)?.find(
				game => game.gameId === games.inside.id
			)?.platinumedAt,
			"2026-05-05"
		);
		assert.equal(new Set(gameIds).size, gameIds?.length);
		assertListMatchesCount(response);
		assert.equal(response.body.data.totals.platinums, 5);
	});
});

void describe("platinum games of a frozen Rewind", () => {
	async function frozenFixture() {
		const fixture = await seedFixture();
		await closeEdition(2026);
		const frozen = await readAs(fixture, fixture.owner.authorization);
		assert.ok(frozen.body.data.frozenAt);
		return { fixture, frozen };
	}

	void it("keeps the photo's list for the owner and the visitor after the platinums change", async () => {
		const { fixture, frozen } = await frozenFixture();
		const row = await findRewindRow(fixture.owner, 2026);
		await fixture.platinums.hades.destroy();
		await fixture.platinums.tunic.update({ platinumedAt: "2026-01-01" });
		await GamePlatinum.update(
			{ platinumedAt: "2026-09-09" },
			{
				where: {
					userId: fixture.owner.user.id,
					gameId: fixture.games.inside.id
				}
			}
		);

		const owner = await readAs(fixture, fixture.owner.authorization);
		const visitor = await readAs(fixture, fixture.visitor.authorization);

		assert.deepEqual(
			row?.snapshot?.owner.platinumGames?.map(game => game.gameId),
			expectedOrder(fixture)
		);
		assert.deepEqual(
			row?.snapshot?.public?.platinumGames?.map(game => game.gameId),
			expectedOrder(fixture)
		);
		assert.deepEqual(platinumGamesOf(owner), platinumGamesOf(frozen));
		assert.deepEqual(platinumGamesOf(visitor), platinumGamesOf(frozen));
		assertListMatchesCount(owner);
		assertListMatchesCount(visitor);
		assert.equal(
			JSON.stringify(row?.snapshot).includes(SECRET_NOTE),
			false
		);
	});

	void it("evaluates the platinum access live on the photo", async () => {
		const { fixture } = await frozenFixture();

		await setPrivacy(fixture.owner, { platinumVisibility: "private" });
		const hidden = await readAs(fixture, fixture.visitor.authorization);
		const owner = await readAs(fixture, fixture.owner.authorization);
		await setPrivacy(fixture.owner, {});
		const reopened = await readAs(fixture, fixture.visitor.authorization);

		assertHidden(hidden);
		assert.equal(platinumGamesOf(owner)?.length, 3);
		assert.equal(platinumGamesOf(reopened)?.length, 3);
	});

	void it("gives every simultaneous reader the same list while the Rewind freezes on read", async () => {
		const fixture = await seedFixture();
		await closeEdition(2026);

		const responses = await Promise.all(
			Array.from({ length: PARALLEL_READERS }, (_, index) =>
				readAs(
					fixture,
					index % 2 === 0 ? fixture.visitor.authorization : undefined
				)
			)
		);

		for (const response of responses) {
			assert.deepEqual(
				platinumGamesOf(response)?.map(game => game.gameId),
				expectedOrder(fixture)
			);
			assertListMatchesCount(response);
		}
	});

	void it("reads a photo frozen before the list existed as an empty list, and hides it without access", async () => {
		const { fixture } = await frozenFixture();
		const row = await findRewindRow(fixture.owner, 2026);
		const snapshot = structuredClone(row!.snapshot!);
		delete snapshot.owner.platinumGames;
		delete snapshot.public?.platinumGames;
		await Rewind.update({ snapshot }, { where: { id: row!.id } });

		const owner = await readAs(fixture, fixture.owner.authorization);
		const visitor = await readAs(fixture, fixture.visitor.authorization);
		await setPrivacy(fixture.owner, { platinumVisibility: "private" });
		const hidden = await readAs(fixture, fixture.visitor.authorization);

		assert.deepEqual(platinumGamesOf(owner), []);
		assert.deepEqual(platinumGamesOf(visitor), []);
		assert.equal(owner.body.data.totals.platinums, 3);
		assertHidden(hidden);
	});

	void it("serves only the known fields of a photo entry carrying extra data", async () => {
		const { fixture } = await frozenFixture();
		const row = await findRewindRow(fixture.owner, 2026);
		const snapshot = structuredClone(row!.snapshot!);
		const tampered = (snapshot.public?.platinumGames ?? []).map(game => ({
			...game,
			notes: SECRET_NOTE,
			backlogId: "leaked-run"
		}));
		snapshot.public!.platinumGames = tampered;
		await Rewind.update({ snapshot }, { where: { id: row!.id } });

		const visitor = await readAs(fixture, fixture.visitor.authorization);

		for (const game of platinumGamesOf(visitor) ?? [])
			assert.deepEqual(Object.keys(game).sort(), PLATINUM_GAME_KEYS);
		assert.equal(JSON.stringify(visitor.body).includes(SECRET_NOTE), false);
		assert.equal(
			JSON.stringify(visitor.body).includes("leaked-run"),
			false
		);
	});
});

void describe("platinum mark on the exact run", () => {
	interface RunMarkFixture {
		owner: Account;
		visitor: Account;
		runIds: string[];
		platinumOfShownHades: () => Promise<unknown>;
	}

	interface ClosedGameBody {
		title: string;
		isPlatinumRun: boolean;
	}

	interface RunMarkBody {
		body: {
			data: {
				finishedGames: ClosedGameBody[];
				abandonedGames: ClosedGameBody[];
			};
		};
	}

	async function seedRunMarkFixture(): Promise<RunMarkFixture> {
		const [owner, visitor] = await Promise.all([
			signUpOn("2025-01-15T00:00:00.000Z"),
			signUpOn("2025-01-15T00:00:00.000Z")
		]);
		const hades = await createGame({ title: "Hades" });
		const celeste = await createGame({ title: "Celeste" });
		const tunic = await createGame({ title: "Tunic" });
		const inside = await createGame({ title: "Inside" });
		const outer = await createGame({ title: "Outer Wilds" });
		const earlierHades = await addRun(owner, hades, platform, {
			finishedAt: "2026-02-01"
		});
		const shownHades = await addRun(owner, hades, platform, {
			finishedAt: "2026-06-01"
		});
		const celesteRun = await addRun(owner, celeste, platform, {
			finishedAt: "2026-03-03"
		});
		const tunicRun = await addRun(owner, tunic, platform, {
			finishedAt: "2026-04-04"
		});
		const insideRun = await addRun(owner, inside, platform, {
			status: "abandoned",
			finishedAt: "2026-05-05"
		});
		const privateOuter = await addRun(owner, outer, platform, {
			finishedAt: "2026-07-07",
			isPublic: false
		});
		const hadesPlatinum = await platinumOf(owner, hades, {
			platinumedAt: "2026-02-02",
			backlogId: earlierHades.id
		});
		await platinumOf(owner, celeste, {
			platinumedAt: "2026-03-04",
			backlogId: celesteRun.id
		});
		await platinumOf(owner, tunic, { platinumedAt: "2026-04-05" });
		await platinumOf(owner, inside, {
			platinumedAt: "2026-05-06",
			backlogId: insideRun.id
		});
		await platinumOf(owner, outer, {
			platinumedAt: "2026-07-08",
			backlogId: privateOuter.id
		});
		await storeRewind(owner, 2026);
		await setPrivacy(owner, {});
		return {
			owner,
			visitor,
			runIds: [
				earlierHades.id,
				shownHades.id,
				celesteRun.id,
				tunicRun.id,
				insideRun.id,
				privateOuter.id
			],
			platinumOfShownHades: () =>
				hadesPlatinum.update({ backlogId: shownHades.id })
		};
	}

	function markedTitles(response: RunMarkBody) {
		const { finishedGames, abandonedGames } = response.body.data;
		return [...finishedGames, ...abandonedGames]
			.filter(game => game.isPlatinumRun)
			.map(game => game.title)
			.sort();
	}

	function readMarks(fixture: RunMarkFixture, authorization?: string) {
		return readRewind(
			fixture.owner.user.username,
			2026,
			authorization
		).expect(200) as Promise<RunMarkBody>;
	}

	function assertNoRunIds(fixture: RunMarkFixture, response: RunMarkBody) {
		const body = JSON.stringify(response.body);
		for (const runId of fixture.runIds)
			assert.equal(body.includes(runId), false);
		assert.equal(body.includes("backlogId"), false);
	}

	void it("marks only the shown run that holds the platinum, never a platinum without run or an earlier run of the game", async () => {
		const fixture = await seedRunMarkFixture();

		const owner = await readMarks(fixture, fixture.owner.authorization);
		const visitor = await readMarks(fixture, fixture.visitor.authorization);

		assert.deepEqual(markedTitles(owner), [
			"Celeste",
			"Inside",
			"Outer Wilds"
		]);
		assert.deepEqual(markedTitles(visitor), ["Celeste", "Inside"]);
		assertNoRunIds(fixture, owner);
		assertNoRunIds(fixture, visitor);
	});

	void it("follows the platinum when it moves to the shown run while the Rewind is live", async () => {
		const fixture = await seedRunMarkFixture();
		await fixture.platinumOfShownHades();

		const owner = await readMarks(fixture, fixture.owner.authorization);

		assert.ok(markedTitles(owner).includes("Hades"));
	});

	void it("marks nothing for a visitor without platinum access", async () => {
		const fixture = await seedRunMarkFixture();
		await setPrivacy(fixture.owner, { platinumVisibility: "private" });

		const visitor = await readMarks(fixture, fixture.visitor.authorization);
		const anonymous = await readMarks(fixture);

		assert.deepEqual(markedTitles(visitor), []);
		assert.deepEqual(markedTitles(anonymous), []);
	});

	void it("keeps the marks of the photo, hides them live without access and ignores a photo frozen without runs", async () => {
		const fixture = await seedRunMarkFixture();
		await closeEdition(2026);
		const frozenOwner = await readMarks(
			fixture,
			fixture.owner.authorization
		);
		await fixture.platinumOfShownHades();

		const owner = await readMarks(fixture, fixture.owner.authorization);
		const visitor = await readMarks(fixture, fixture.visitor.authorization);
		await setPrivacy(fixture.owner, { platinumVisibility: "private" });
		const hidden = await readMarks(fixture, fixture.visitor.authorization);
		await setPrivacy(fixture.owner, {});
		const row = await findRewindRow(fixture.owner, 2026);
		const snapshot = structuredClone(row!.snapshot!);
		for (const view of [snapshot.owner, snapshot.public])
			for (const game of view?.finishedGames ?? []) delete game.backlogId;
		await Rewind.update({ snapshot }, { where: { id: row!.id } });
		const beforeRuns = await readMarks(
			fixture,
			fixture.owner.authorization
		);

		assert.deepEqual(markedTitles(frozenOwner), [
			"Celeste",
			"Inside",
			"Outer Wilds"
		]);
		assert.deepEqual(markedTitles(owner), markedTitles(frozenOwner));
		assert.deepEqual(markedTitles(visitor), ["Celeste", "Inside"]);
		assert.deepEqual(markedTitles(hidden), []);
		assert.deepEqual(markedTitles(beforeRuns), ["Inside"]);
		assertNoRunIds(fixture, owner);
		assertNoRunIds(fixture, visitor);
	});
});
