import "../rawg/rawg-env.setup";

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { Game } from "../../src/games/game.model";
import { registerExternalDataSources } from "../../src/games/services/external-data-sources.service";
import {
	isImportEnrichmentPaused,
	whenImportEnrichmentIdle
} from "../../src/games/services/games-import-enrichment.service";
import { type RawgGameDetail } from "../../src/rawg/rawg.interface";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGame } from "../helpers/factories.helper";
import {
	ELDEN_RING_DETAIL,
	UNRATED_DETAIL
} from "../rawg/fixtures/rawg.fixtures";
import { rawgCatalogHandler, stubRawgFetch } from "../rawg/rawg-fetch.helper";
import { seedRawgCatalog } from "../rawg/rawg-seed.helper";
import {
	deferred,
	fakeHltb,
	fakeMetacritic,
	fakeWikidata,
	hltbCandidate,
	hltbDetail,
	metacriticDetail,
	providerError,
	registerFakes
} from "./external-data-fakes.helper";

let authorization: string;

useTestDatabase(async () => {
	await seedRawgCatalog();
	authorization = (await createUserWithSession()).authorization;
});

afterEach(async () => {
	await whenImportEnrichmentIdle();
	registerExternalDataSources({});
	mock.restoreAll();
});

function rawgGame(
	id: number,
	name: string,
	metacritic: number | null = null
): RawgGameDetail {
	return {
		...UNRATED_DETAIL,
		id,
		slug: name.toLowerCase().replaceAll(" ", "-"),
		name,
		metacritic
	};
}

function stubRawgCatalog(details: RawgGameDetail[]) {
	return stubRawgFetch(
		rawgCatalogHandler({
			search: { count: details.length, next: null, results: details },
			details
		})
	);
}

function searchGames(query: string, forceRawg = true) {
	return api()
		.get("/games/search")
		.query({ search: query, ...(forceRawg ? { force_online: "true" } : {}) })
		.set("Authorization", authorization);
}

function slugOf(name: string) {
	return name.toLowerCase().replaceAll(" ", "-");
}

function hltbIdOf(name: string) {
	return `hltb-${slugOf(name)}`;
}

function catalogFakes(
	options: {
		metaScore?: number;
		mainStoryHours?: number;
	} = {}
) {
	const metacritic = fakeMetacritic(slug =>
		metacriticDetail({
			slug,
			title: slug.replaceAll("-", " "),
			metaScore: options.metaScore ?? 81
		})
	);
	const wikidata = fakeWikidata(({ rawgSlug }) =>
		rawgSlug
			? [
					hltbCandidate({
						hltbId: `hltb-${rawgSlug}`,
						rawgSlug
					})
				]
			: []
	);
	const hltb = fakeHltb(id =>
		hltbDetail({ id, mainStoryHours: options.mainStoryHours ?? 12 })
	);
	return { metacritic, wikidata, hltb };
}

async function storedGame(name: string) {
	const game = await Game.findOne({ where: { code: slugOf(name) } });
	assert.ok(game, `${name} was not imported`);
	return game;
}

async function metacriticScoreOf(gameId: string) {
	const score = await GameScore.findOne({
		where: { gameId, source: "metacritic" }
	});
	return score?.score ?? null;
}

async function hltbTimeOf(gameId: string) {
	const time = await GameTime.findOne({ where: { gameId, source: "hltb" } });
	return time?.duration ?? null;
}

void describe("GET /games/search enriches games imported from RAWG", () => {
	void it("queues the imported games and stores their Metacritic score and HLTB time in the background", async () => {
		stubRawgCatalog([rawgGame(900001, "Quiet Harbor")]);
		const fakes = catalogFakes({ metaScore: 77, mainStoryHours: 9 });
		registerFakes(fakes);

		const response = await searchGames("quiet harbor");
		assert.equal(response.status, 200);
		assert.equal(response.body.data.games[0].justImported, true);

		await whenImportEnrichmentIdle();
		const game = await storedGame("Quiet Harbor");
		assert.equal(await metacriticScoreOf(game.id), 77);
		assert.equal(await hltbTimeOf(game.id), 9);
		assert.deepEqual(fakes.metacritic.calls, ["quiet-harbor"]);
		assert.deepEqual(fakes.hltb.calls, [hltbIdOf("Quiet Harbor")]);
	});

	void it("asks only HLTB for a game that RAWG imported with a Metacritic score", async () => {
		stubRawgCatalog([ELDEN_RING_DETAIL]);
		const fakes = catalogFakes({ metaScore: 10, mainStoryHours: 58 });
		registerFakes(fakes);

		const response = await searchGames("elden ring");
		assert.equal(response.status, 200);
		await whenImportEnrichmentIdle();

		const game = await storedGame("Elden Ring");
		assert.deepEqual(fakes.metacritic.calls, []);
		assert.equal(await metacriticScoreOf(game.id), 96);
		assert.equal(await hltbTimeOf(game.id), 58);
	});

	void it("answers the search without waiting for a slow provider, and a repeated search does not queue the game twice", async () => {
		stubRawgCatalog([rawgGame(900002, "Slow Lantern")]);
		const fakes = catalogFakes();
		const gate = deferred<undefined>();
		const slowHltb = fakeHltb(async id => {
			await gate.promise;
			return hltbDetail({ id, mainStoryHours: 21 });
		});
		registerFakes({ ...fakes, hltb: slowHltb });

		try {
			const first = await searchGames("slow lantern");
			assert.equal(first.status, 200);
			assert.equal(first.body.data.games[0].justImported, true);

			const second = await searchGames("slow lantern");
			assert.equal(second.status, 200);
			assert.equal(second.body.data.games[0].justImported, false);

			const game = await storedGame("Slow Lantern");
			assert.equal(await hltbTimeOf(game.id), null);
		} finally {
			gate.resolve(undefined);
		}

		await whenImportEnrichmentIdle();
		const game = await storedGame("Slow Lantern");
		assert.equal(await hltbTimeOf(game.id), 21);
		assert.equal(fakes.metacritic.calls.length, 1);
		assert.equal(fakes.wikidata.calls.length, 1);
		assert.equal(slowHltb.calls.length, 1);
	});

	void it("does not queue games that already existed, from local results or from RAWG", async () => {
		await createGame({ title: "Local Orchard" });
		stubRawgCatalog([rawgGame(900001, "Quiet Harbor")]);
		const fakes = catalogFakes();
		registerFakes(fakes);

		const local = await searchGames("local orchard", false);
		const rawg = await searchGames("quiet harbor");
		assert.equal(local.status, 200);
		assert.equal(local.body.data.games[0].title, "Local Orchard");
		assert.equal(rawg.status, 200);
		assert.equal(rawg.body.data.games[0].justImported, false);

		await whenImportEnrichmentIdle();
		assert.deepEqual(fakes.metacritic.calls, []);
		assert.deepEqual(fakes.wikidata.calls, []);
		assert.deepEqual(fakes.hltb.calls, []);
	});

	void it("does nothing when no external source is registered", async () => {
		stubRawgCatalog([rawgGame(900003, "Unplugged Meadow")]);

		const response = await searchGames("unplugged meadow");
		assert.equal(response.status, 200);
		await whenImportEnrichmentIdle();

		const game = await storedGame("Unplugged Meadow");
		assert.equal(await metacriticScoreOf(game.id), null);
		assert.equal(await hltbTimeOf(game.id), null);
	});

	void it("keeps the search and the queue going when a provider fails", async () => {
		stubRawgCatalog([
			rawgGame(900004, "Broken Bridge"),
			rawgGame(900005, "Sturdy Bridge")
		]);
		const fakes = catalogFakes({ metaScore: 64, mainStoryHours: 7 });
		const flakyHltb = fakeHltb(id =>
			id === hltbIdOf("Broken Bridge")
				? providerError("HLTB_TIMEOUT")
				: hltbDetail({ id, mainStoryHours: 7 })
		);
		registerFakes({ ...fakes, hltb: flakyHltb });

		const response = await searchGames("bridge");
		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 2);
		await whenImportEnrichmentIdle();

		const broken = await storedGame("Broken Bridge");
		const sturdy = await storedGame("Sturdy Bridge");
		assert.equal(await metacriticScoreOf(broken.id), 64);
		assert.equal(await hltbTimeOf(broken.id), null);
		assert.equal(await metacriticScoreOf(sturdy.id), 64);
		assert.equal(await hltbTimeOf(sturdy.id), 7);
		assert.equal(isImportEnrichmentPaused(), false);
	});

	void it("empties the queue and pauses when a provider reports BLOCKED", async () => {
		stubRawgCatalog([
			rawgGame(900006, "First Wall"),
			rawgGame(900007, "Second Wall"),
			rawgGame(900008, "Third Wall")
		]);
		const fakes = catalogFakes();
		const blockedMetacritic = fakeMetacritic(() =>
			providerError("METACRITIC_BLOCKED")
		);
		registerFakes({ ...fakes, metacritic: blockedMetacritic });

		const response = await searchGames("wall");
		assert.equal(response.status, 200);
		assert.equal(response.body.data.games.length, 3);
		await whenImportEnrichmentIdle();

		assert.equal(isImportEnrichmentPaused(), true);
		assert.deepEqual(blockedMetacritic.calls, ["first-wall"]);
		assert.equal(fakes.wikidata.calls.length, 1);
		const second = await storedGame("Second Wall");
		assert.equal(await hltbTimeOf(second.id), null);

		mock.restoreAll();
		stubRawgCatalog([rawgGame(900009, "Late Tower")]);
		const later = await searchGames("late tower");
		assert.equal(later.status, 200);
		assert.equal(later.body.data.games[0].justImported, true);
		await whenImportEnrichmentIdle();

		assert.deepEqual(blockedMetacritic.calls, ["first-wall"]);
		assert.equal(fakes.wikidata.calls.length, 1);
		assert.equal(fakes.hltb.calls.length, 1);
	});
});
