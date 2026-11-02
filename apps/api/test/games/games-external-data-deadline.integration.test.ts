import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { GameExternal } from "../../src/game-external/game-external.model";
import { GameScore } from "../../src/game-scores/game-score.model";
import { GameTime } from "../../src/game-times/game-time.model";
import {
	EXTERNAL_DATA_DEADLINE_EXCEEDED,
	EXTERNAL_DATA_REFRESH_DEADLINE_MS
} from "../../src/games/games.constants";
import {
	type ExternalDataRequestOptions,
	type HltbIdCandidate,
	type HltbSourceDetail,
	type MetacriticSourceDetail
} from "../../src/games/games-external-data.interface";
import {
	registerExternalDataRefreshTimer,
	registerExternalDataSources
} from "../../src/games/services/external-data-sources.service";
import { refreshExternalDataForGame } from "../../src/games/services/games-external-data.service";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createScoreSource } from "../helpers/factories.helper";
import {
	createCatalogGame,
	hltbCandidate,
	hltbDetail,
	linkExternal,
	metacriticDetail,
	providerError
} from "./external-data-fakes.helper";

const SHORT_DEADLINE_MS = 300;
const SLOW_SOURCE_MS = 900;
const AFTER_SLOW_SOURCE_MS = SLOW_SOURCE_MS + 400;

let moderator: string;

useTestDatabase(async () => {
	await createScoreSource({ code: "metacritic", scale: 100 });
	moderator = (await createUserWithSession("moderator")).authorization;
});

afterEach(() => {
	registerExternalDataSources({});
	registerExternalDataRefreshTimer();
});

function refresh(gameId: string, sources: string[]) {
	return api()
		.post(`/games/${gameId}/external-data/refresh`)
		.set("Authorization", moderator)
		.send({ sources });
}

function slowlyResolve<T>(value: T, milliseconds = SLOW_SOURCE_MS) {
	return delay(milliseconds).then(() => value);
}

function rejectWhenAborted(signal: AbortSignal | undefined, code: string) {
	return new Promise<never>((_resolve, reject) => {
		signal?.addEventListener("abort", () => reject(providerError(code)), {
			once: true
		});
	});
}

interface RecordedCall<Input> {
	input: Input;
	options: ExternalDataRequestOptions | undefined;
}

type Responder<Input, Output> = (
	options: ExternalDataRequestOptions | undefined,
	input: Input
) => Promise<Output>;

function recorded<Input, Output>(respond: Responder<Input, Output>) {
	const calls: RecordedCall<Input>[] = [];
	const call = (input: Input, options?: ExternalDataRequestOptions) => {
		calls.push({ input, options });
		return respond(options, input);
	};
	return { calls, call };
}

function metacriticSource(respond: Responder<string, MetacriticSourceDetail>) {
	const { calls, call } = recorded(respond);
	return { calls, source: { getGameBySlug: call } };
}

function hltbSource(respond: Responder<string, HltbSourceDetail>) {
	const { calls, call } = recorded(respond);
	return { calls, source: { getGameById: call } };
}

function wikidataSource(
	respond: Responder<
		{ rawgSlug: string | null; title: string },
		HltbIdCandidate[]
	>
) {
	const { calls, call } = recorded(respond);
	return { calls, source: { findHltbCandidates: call } };
}

async function storedState(gameId: string) {
	const [score, time, externals] = await Promise.all([
		GameScore.findOne({ where: { gameId, source: "metacritic" } }),
		GameTime.findOne({ where: { gameId, source: "hltb" } }),
		GameExternal.findAll({ where: { gameId }, order: [["source", "ASC"]] })
	]);
	return {
		score: score?.score ?? null,
		time: time?.duration ?? null,
		externals: externals.map(e => `${e.source}:${e.externalId}`)
	};
}

function deadlineExceeded(source: string) {
	return {
		source,
		status: "failed",
		errorCode: EXTERNAL_DATA_DEADLINE_EXCEEDED
	};
}

void describe("POST /games/:id/external-data/refresh — deadline", () => {
	void it("answers within the deadline, keeps the source that finished and saves nothing after the abort", async () => {
		registerExternalDataRefreshTimer({ deadlineMs: SHORT_DEADLINE_MS });
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "metacritic", "hades");
		await linkExternal(game.id, "hltb", "1234");
		const metacritic = metacriticSource(async () =>
			metacriticDetail({ slug: "hades", title: "Hades", metaScore: 93 })
		);
		const hltb = hltbSource(() =>
			slowlyResolve(hltbDetail({ id: "1234", mainStoryHours: 21.5 }))
		);
		registerExternalDataSources({
			metacritic: metacritic.source,
			hltb: hltb.source
		});

		const startedAt = Date.now();
		const response = await refresh(game.id, ["metacritic", "hltb"]);
		const elapsed = Date.now() - startedAt;

		assert.equal(response.status, 200);
		assert.ok(
			elapsed < SLOW_SOURCE_MS,
			`answered after ${elapsed}ms, the slow source takes ${SLOW_SOURCE_MS}ms`
		);
		assert.deepEqual(response.body.data.results, [
			{
				source: "metacritic",
				status: "updated",
				score: 93,
				metaScore: 93,
				userScore: null,
				errorCode: null
			},
			deadlineExceeded("hltb")
		]);
		assert.deepEqual(
			response.body.data.game.scores.map(
				(s: { source: string; score: number }) => [s.source, s.score]
			),
			[["metacritic", 93]]
		);
		assert.deepEqual(response.body.data.game.times, []);

		await delay(AFTER_SLOW_SOURCE_MS);

		assert.deepEqual(await storedState(game.id), {
			score: 93,
			time: null,
			externals: ["hltb:1234", "metacritic:hades"]
		});
	});

	void it("marks every pending source as failed when the deadline expires during the first one", async () => {
		registerExternalDataRefreshTimer({ deadlineMs: SHORT_DEADLINE_MS });
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "metacritic", "hades");
		await linkExternal(game.id, "hltb", "1234");
		const metacritic = metacriticSource(() =>
			slowlyResolve(
				metacriticDetail({
					slug: "hades",
					title: "Hades",
					metaScore: 93
				})
			)
		);
		const hltb = hltbSource(async () =>
			hltbDetail({ id: "1234", mainStoryHours: 21.5 })
		);
		registerExternalDataSources({
			metacritic: metacritic.source,
			hltb: hltb.source
		});

		const response = await refresh(game.id, ["metacritic", "hltb"]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			deadlineExceeded("metacritic"),
			deadlineExceeded("hltb")
		]);
		assert.equal(hltb.calls.length, 0);

		await delay(AFTER_SLOW_SOURCE_MS);

		const state = await storedState(game.id);
		assert.equal(state.score, null);
		assert.equal(state.time, null);
	});

	void it("does not save matches found by a search that the deadline cut short", async () => {
		registerExternalDataRefreshTimer({ deadlineMs: SHORT_DEADLINE_MS });
		const game = await createCatalogGame("Hades", { code: "hades" });
		const metacritic = metacriticSource(() =>
			slowlyResolve(
				metacriticDetail({
					slug: "hades",
					title: "Hades",
					metaScore: 93
				})
			)
		);
		const wikidata = wikidataSource(() =>
			slowlyResolve([
				hltbCandidate({ hltbId: "1234", rawgSlug: "hades" })
			])
		);
		const hltb = hltbSource(async () =>
			hltbDetail({ id: "1234", title: "Hades", mainStoryHours: 21.5 })
		);
		registerExternalDataSources({
			metacritic: metacritic.source,
			hltb: hltb.source,
			hltbIdResolver: wikidata.source
		});

		const metacriticOnly = await refresh(game.id, ["metacritic"]);
		const hltbOnly = await refresh(game.id, ["hltb"]);

		assert.deepEqual(metacriticOnly.body.data.results, [
			deadlineExceeded("metacritic")
		]);
		assert.deepEqual(hltbOnly.body.data.results, [
			deadlineExceeded("hltb")
		]);
		assert.equal(hltb.calls.length, 0);

		await delay(AFTER_SLOW_SOURCE_MS);

		assert.deepEqual(await storedState(game.id), {
			score: null,
			time: null,
			externals: []
		});
	});

	void it("asks the sources with interactive priority and aborts them when the deadline expires", async () => {
		let expire!: () => void;
		let scheduledMs: number | undefined;
		let cancelled = 0;
		registerExternalDataRefreshTimer({
			startTimer(milliseconds, onExpire) {
				scheduledMs = milliseconds;
				expire = onExpire;
				return () => {
					cancelled += 1;
				};
			}
		});
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		const hltb = hltbSource(options => {
			const aborted = rejectWhenAborted(options?.signal, "HLTB_ABORTED");
			expire();
			return aborted;
		});
		registerExternalDataSources({ hltb: hltb.source });

		const response = await refresh(game.id, ["hltb"]);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.results, [
			deadlineExceeded("hltb")
		]);
		assert.equal(scheduledMs, EXTERNAL_DATA_REFRESH_DEADLINE_MS);
		assert.equal(cancelled, 1);
		assert.equal(hltb.calls.length, 1);
		assert.equal(hltb.calls[0]!.input, "1234");
		assert.equal(hltb.calls[0]!.options?.priority, "interactive");
		assert.equal(hltb.calls[0]!.options?.signal?.aborted, true);
	});

	void it("a refresh that finishes in time cancels the timer and is not affected", async () => {
		let cancelled = 0;
		let expired = false;
		registerExternalDataRefreshTimer({
			startTimer(milliseconds, onExpire) {
				const timer = setTimeout(() => {
					expired = true;
					onExpire();
				}, milliseconds);
				return () => {
					cancelled += 1;
					clearTimeout(timer);
				};
			},
			deadlineMs: SHORT_DEADLINE_MS
		});
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		const hltb = hltbSource(async () =>
			hltbDetail({ id: "1234", mainStoryHours: 21.5 })
		);
		registerExternalDataSources({ hltb: hltb.source });

		const response = await refresh(game.id, ["hltb"]);
		await delay(SHORT_DEADLINE_MS + 100);

		assert.deepEqual(response.body.data.results, [
			{
				source: "hltb",
				status: "updated",
				duration: 21.5,
				errorCode: null
			}
		]);
		assert.equal(cancelled, 1);
		assert.equal(expired, false);
		assert.equal((await storedState(game.id)).time, 21.5);
	});
});

void describe("refreshExternalDataForGame outside the endpoint", () => {
	void it("runs in background priority and without a deadline, as the job and the import queue use it", async () => {
		registerExternalDataRefreshTimer({ deadlineMs: 50 });
		const game = await createCatalogGame("Hades");
		await linkExternal(game.id, "hltb", "1234");
		const hltb = hltbSource(() =>
			slowlyResolve(hltbDetail({ id: "1234", mainStoryHours: 21.5 }), 200)
		);
		registerExternalDataSources({ hltb: hltb.source });

		const results = await refreshExternalDataForGame(game, ["hltb"]);

		assert.deepEqual(results, [
			{
				source: "hltb",
				status: "updated",
				duration: 21.5,
				errorCode: null
			}
		]);
		assert.equal(hltb.calls[0]!.options?.priority, undefined);
		assert.equal(hltb.calls[0]!.options?.signal, undefined);
	});
});
