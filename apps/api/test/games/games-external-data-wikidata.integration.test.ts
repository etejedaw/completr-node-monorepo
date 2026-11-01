import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { GameExternal } from "../../src/game-external/game-external.model";
import { GameTime } from "../../src/game-times/game-time.model";
import { registerExternalDataSources } from "../../src/games/services/external-data-sources.service";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createGameTime } from "../helpers/factories.helper";
import {
	createCatalogGame,
	fakeHltb,
	fakeWikidata,
	hltbCandidate,
	hltbDetail,
	hltbPages,
	linkExternal,
	providerError,
	registerFakes,
	wikidataCandidates
} from "./external-data-fakes.helper";

let moderator: string;

useTestDatabase(async () => {
	moderator = (await createUserWithSession("moderator")).authorization;
});

afterEach(() => {
	registerExternalDataSources({});
});

function refreshHltb(gameId: string) {
	return api()
		.post(`/games/${gameId}/external-data/refresh`)
		.set("Authorization", moderator)
		.send({ sources: ["hltb"] });
}

async function hltbStateOf(gameId: string) {
	const [time, externals] = await Promise.all([
		GameTime.findOne({ where: { gameId, source: "hltb" } }),
		GameExternal.findAll({ where: { gameId, source: "hltb" } })
	]);
	return {
		time: time?.duration ?? null,
		externalIds: externals.map(external => external.externalId)
	};
}

function hltbResultOf(response: {
	status: number;
	body: { data: { results: unknown[] } };
}) {
	assert.equal(response.status, 200);
	assert.equal(response.body.data.results.length, 1);
	return response.body.data.results[0];
}

void describe("POST /games/:id/external-data/refresh — HLTB id through Wikidata, RAWG slug", () => {
	void it("resolves the id by RAWG slug, trusts it without checking the HLTB title and stores it", async () => {
		const game = await createCatalogGame("The Witcher 3: Wild Hunt", {
			code: "the-witcher-3-wild-hunt",
			releaseAt: "2015-05-19"
		});
		const wikidata = wikidataCandidates([
			hltbCandidate({
				hltbId: "10270",
				label: "The Witcher 3: Wild Hunt",
				releaseYear: 2015,
				rawgSlug: "the-witcher-3-wild-hunt"
			})
		]);
		const hltb = hltbPages([
			hltbDetail({
				id: "10270",
				title: "The Witcher III - Wild Hunt GOTY",
				mainStoryHours: 51.67
			})
		]);
		registerFakes({ hltb, wikidata });

		const response = await refreshHltb(game.id);

		assert.deepEqual(hltbResultOf(response), {
			source: "hltb",
			status: "updated",
			duration: 51.67,
			errorCode: null
		});
		assert.deepEqual(wikidata.calls, [
			{
				rawgSlug: "the-witcher-3-wild-hunt",
				title: "The Witcher 3: Wild Hunt"
			}
		]);
		assert.deepEqual(hltb.calls, ["10270"]);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: 51.67,
			externalIds: ["10270"]
		});
	});

	void it("accepts several slug rows when they share the same id", async () => {
		const game = await createCatalogGame("Hades", { code: "hades-slug" });
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "62941",
					rawgSlug: "hades-slug",
					releaseYear: 2018
				}),
				hltbCandidate({
					hltbId: "62941",
					rawgSlug: "hades-slug",
					releaseYear: 2020
				}),
				hltbCandidate({
					hltbId: "999",
					label: "Hades II",
					rawgSlug: "hades-2"
				})
			]),
			hltb: hltbPages([
				hltbDetail({ id: "62941", title: "Hades", mainStoryHours: 22 })
			])
		});

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"updated"
		);
		assert.deepEqual((await hltbStateOf(game.id)).externalIds, ["62941"]);
	});

	void it("falls back to the label when the slug rows disagree on the id", async () => {
		const game = await createCatalogGame("Doom", {
			code: "doom-slug",
			releaseAt: "2016-05-13"
		});
		const hltb = hltbPages([
			hltbDetail({ id: "2", title: "DOOM", mainStoryHours: 11.5 })
		]);
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "1",
					rawgSlug: "doom-slug",
					label: "Doom",
					releaseYear: 1993
				}),
				hltbCandidate({
					hltbId: "2",
					rawgSlug: "doom-slug",
					label: "Doom",
					releaseYear: 2016
				})
			]),
			hltb
		});

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"updated"
		);
		assert.deepEqual(hltb.calls, ["2"]);
		assert.deepEqual((await hltbStateOf(game.id)).externalIds, ["2"]);
	});
});

void describe("POST /games/:id/external-data/refresh — HLTB id through Wikidata, label", () => {
	void it("resolves by exact label within one year and validates the HLTB title", async () => {
		const game = await createCatalogGame("Celeste", {
			code: "celeste-unknown-slug",
			releaseAt: "2018-01-25"
		});
		const hltb = hltbPages([
			hltbDetail({ id: "42818", title: "Celeste", mainStoryHours: 8 })
		]);
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "42818",
					label: "Celeste",
					releaseYear: 2019
				}),
				hltbCandidate({
					hltbId: "7",
					label: "Celeste",
					releaseYear: 2005
				}),
				hltbCandidate({
					hltbId: "8",
					label: "Celeste Classic",
					releaseYear: 2018
				})
			]),
			hltb
		});

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"updated"
		);
		assert.deepEqual(hltb.calls, ["42818"]);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: 8,
			externalIds: ["42818"]
		});
	});

	void it("compares labels after normalizing accents, case and punctuation", async () => {
		const game = await createCatalogGame("Pokémon: Let's Go, Pikachu!");
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "55",
					label: "Pokemon Lets Go Pikachu"
				})
			]),
			hltb: hltbPages([
				hltbDetail({
					id: "55",
					title: "Pokémon: Let’s Go, Pikachu!",
					mainStoryHours: 25
				})
			])
		});

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"updated"
		);
	});

	void it("answers ambiguous without calling HLTB when two ids share the label", async () => {
		const game = await createCatalogGame("Prey", {
			releaseAt: "2017-05-05"
		});
		const hltb = hltbPages([]);
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "100",
					label: "Prey",
					releaseYear: 2017
				}),
				hltbCandidate({
					hltbId: "200",
					label: "Prey",
					releaseYear: null
				})
			]),
			hltb
		});

		const response = await refreshHltb(game.id);

		assert.deepEqual(hltbResultOf(response), {
			source: "hltb",
			status: "ambiguous",
			errorCode: null
		});
		assert.equal(hltb.calls.length, 0);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: null,
			externalIds: []
		});
	});

	void it("answers not_found without calling HLTB when the only label is more than one year apart", async () => {
		const game = await createCatalogGame("Prey", {
			releaseAt: "2017-05-05"
		});
		const hltb = hltbPages([
			hltbDetail({ id: "100", title: "Prey", mainStoryHours: 6 })
		]);
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "100",
					label: "Prey",
					releaseYear: 2006
				})
			]),
			hltb
		});

		const response = await refreshHltb(game.id);

		assert.deepEqual(hltbResultOf(response), {
			source: "hltb",
			status: "not_found",
			errorCode: null
		});
		assert.equal(hltb.calls.length, 0);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: null,
			externalIds: []
		});
	});

	void it("answers not_found without calling HLTB when Wikidata returns nothing", async () => {
		const game = await createCatalogGame("Unknown Indie");
		const hltb = hltbPages([]);
		registerFakes({ wikidata: wikidataCandidates([]), hltb });

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"not_found"
		);
		assert.equal(hltb.calls.length, 0);
	});

	void it("answers ambiguous and stores nothing when the HLTB page is another game", async () => {
		const game = await createCatalogGame("Celeste", {
			releaseAt: "2018-01-25"
		});
		const hltb = hltbPages([
			hltbDetail({
				id: "42818",
				title: "Celeste Classic",
				mainStoryHours: 1
			})
		]);
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({
					hltbId: "42818",
					label: "Celeste",
					releaseYear: 2018
				})
			]),
			hltb
		});

		const response = await refreshHltb(game.id);

		assert.deepEqual(hltbResultOf(response), {
			source: "hltb",
			status: "ambiguous",
			errorCode: null
		});
		assert.deepEqual(hltb.calls, ["42818"]);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: null,
			externalIds: []
		});
	});

	void it("answers not_found and stores nothing when HLTB no longer knows the resolved id", async () => {
		const game = await createCatalogGame("Celeste");
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({ hltbId: "42818", label: "Celeste" })
			]),
			hltb: hltbPages([])
		});

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"not_found"
		);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: null,
			externalIds: []
		});
	});

	void it("stores the resolved id even when the page has no Main Story", async () => {
		const game = await createCatalogGame("Celeste");
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({ hltbId: "42818", label: "Celeste" })
			]),
			hltb: hltbPages([
				hltbDetail({
					id: "42818",
					title: "Celeste",
					mainStoryHours: null
				})
			])
		});

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"no_data"
		);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: null,
			externalIds: ["42818"]
		});
	});
});

void describe("POST /games/:id/external-data/refresh — HLTB id through Wikidata, edges", () => {
	void it("does not ask Wikidata when the game already has an HLTB id", async () => {
		const game = await createCatalogGame("Celeste", { code: "celeste" });
		await linkExternal(game.id, "hltb", "42818");
		const wikidata = wikidataCandidates([
			hltbCandidate({ hltbId: "1", rawgSlug: "celeste" })
		]);
		const hltb = hltbPages([
			hltbDetail({ id: "42818", mainStoryHours: 8 })
		]);
		registerFakes({ wikidata, hltb });

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"updated"
		);
		assert.equal(wikidata.calls.length, 0);
		assert.deepEqual(hltb.calls, ["42818"]);
	});

	void it("keeps answering not_found without an id when no resolver is registered", async () => {
		const game = await createCatalogGame("Celeste");
		const hltb = hltbPages([
			hltbDetail({ id: "42818", mainStoryHours: 8 })
		]);
		registerFakes({ hltb });

		const response = await refreshHltb(game.id);

		assert.equal(
			(hltbResultOf(response) as { status: string }).status,
			"not_found"
		);
		assert.equal(hltb.calls.length, 0);
	});

	for (const code of [
		"WIKIDATA_TIMEOUT",
		"WIKIDATA_BLOCKED",
		"WIKIDATA_RATE_LIMITED",
		"WIKIDATA_PARSE_ERROR",
		"WIKIDATA_REQUEST_ERROR"
	]) {
		void it(`answers failed ${code}, keeps the stored duration and does not call HLTB`, async () => {
			const game = await createCatalogGame("Celeste");
			await createGameTime(game.id, "hltb", 9);
			const hltb = hltbPages([
				hltbDetail({ id: "42818", mainStoryHours: 8 })
			]);
			registerFakes({
				wikidata: fakeWikidata(() => providerError(code)),
				hltb
			});

			const response = await refreshHltb(game.id);

			assert.deepEqual(hltbResultOf(response), {
				source: "hltb",
				status: "failed",
				errorCode: code
			});
			assert.equal(hltb.calls.length, 0);
			assert.deepEqual(await hltbStateOf(game.id), {
				time: 9,
				externalIds: []
			});
		});
	}

	void it("answers failed with the HLTB code when the page fails after resolving", async () => {
		const game = await createCatalogGame("Celeste");
		registerFakes({
			wikidata: wikidataCandidates([
				hltbCandidate({ hltbId: "42818", label: "Celeste" })
			]),
			hltb: fakeHltb(() => providerError("HLTB_BLOCKED"))
		});

		const response = await refreshHltb(game.id);

		assert.deepEqual(hltbResultOf(response), {
			source: "hltb",
			status: "failed",
			errorCode: "HLTB_BLOCKED"
		});
		assert.deepEqual(await hltbStateOf(game.id), {
			time: null,
			externalIds: []
		});
	});

	void it("survives two simultaneous refreshes that resolve the id", async () => {
		const game = await createCatalogGame("Hollow Knight", {
			code: "hollow-knight"
		});
		const wikidata = wikidataCandidates([
			hltbCandidate({ hltbId: "26286", rawgSlug: "hollow-knight" })
		]);
		registerFakes({
			wikidata,
			hltb: hltbPages([
				hltbDetail({
					id: "26286",
					title: "Hollow Knight",
					mainStoryHours: 26.5
				})
			])
		});

		const responses = await Promise.all([
			refreshHltb(game.id),
			refreshHltb(game.id)
		]);

		for (const response of responses)
			assert.equal(
				(hltbResultOf(response) as { status: string }).status,
				"updated"
			);
		assert.equal(wikidata.calls.length, 2);
		assert.deepEqual(await hltbStateOf(game.id), {
			time: 26.5,
			externalIds: ["26286"]
		});
		assert.equal(await GameTime.count({ where: { gameId: game.id } }), 1);
	});
});
