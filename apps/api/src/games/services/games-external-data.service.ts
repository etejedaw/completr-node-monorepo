import { ServiceError } from "../../common/errors/service-error";
import * as externalDataAttemptsService from "../../external-data-attempts/external-data-attempts.service";
import { type ExternalSource } from "../../game-external/game-external.model";
import * as gameExternalService from "../../game-external/game-external.service";
import * as gameScoresService from "../../game-scores/game-scores.service";
import * as gameTimesService from "../../game-times/game-times.service";
import { type IgdbGame } from "../../igdb/igdb.interface";
import * as gamesServiceError from "../errors/games.service-error";
import {
	EXTERNAL_DATA_DEADLINE_EXCEEDED,
	EXTERNAL_DATA_SOURCE_UNAVAILABLE,
	type ExternalDataSource,
	HLTB_ID_LOOKUP_PAUSED,
	IGDB_SEARCH_LIMIT
} from "../games.constants";
import {
	type ExternalDataAttemptRecord,
	type ExternalDataCandidate,
	type ExternalDataCandidates,
	type ExternalDataGame,
	type ExternalDataPendingCandidate,
	type ExternalDataRefreshOptions,
	type ExternalDataRequestOptions,
	type ExternalDataResult,
	type HltbSource,
	type IgdbSource,
	type MetacriticSlugCandidate,
	type MetacriticSource,
	type MetacriticSourceDetail
} from "../games-external-data.interface";
import {
	type HltbLookup,
	type IgdbLookup,
	type MetacriticLookup
} from "../games-external-data.types";
import { extractIgdbUserRating } from "../mappers/extractors/igdb-score.extractors";
import { buildMetacriticSlugCandidates } from "../utils/build-metacritic-slug-candidates.util";
import { classifyExternalDataError } from "../utils/classify-external-data-error.util";
import { externalDataAttemptStatus } from "../utils/external-data-attempt-status.util";
import { isCoolingDown } from "../utils/is-cooling-down.util";
import { isReleaseYearMismatch } from "../utils/is-release-year-mismatch.util";
import { normalizeGameTitle } from "../utils/normalize-game-title.util";
import { pickMetacriticScore } from "../utils/pick-metacritic-score.util";
import { resolveHltbId } from "../utils/resolve-hltb-id.util";
import { untilAborted } from "../utils/until-aborted.util";
import {
	findUnavailableSources,
	getExternalDataRefreshTimer,
	getHltbIdResolver,
	getHltbSource,
	getIgdbRequestPacer,
	getIgdbSource,
	getMetacriticSource,
	isExternalDataSourceTracked
} from "./external-data-sources.service";
import {
	findActiveGamesForExternalData,
	findGameById
} from "./games-search.service";

const METACRITIC_SCORE_SOURCE = "metacritic";
const HLTB_TIME_SOURCE = "hltb";
const IGDB_SCORE_SOURCE = "igdb";
const IGDB_ID_PATTERN = /^\d+$/;

export function assertExternalDataSourcesAvailable(
	sources: readonly ExternalDataSource[]
) {
	const unavailable = findUnavailableSources(sources);
	if (unavailable.length > 0)
		throw gamesServiceError.externalDataSourceUnavailableError(unavailable);
}

export async function refreshGameExternalData(
	gameId: string,
	sources: readonly ExternalDataSource[]
) {
	const game = await findGameById(gameId);
	if (!game) return null;

	const results = await refreshWithinDeadline(game, sources);
	const refreshedGame = await findGameById(gameId);
	return { game: refreshedGame ?? game, results };
}

async function refreshWithinDeadline(
	game: ExternalDataGame,
	sources: readonly ExternalDataSource[]
) {
	const { deadlineMs, startTimer } = getExternalDataRefreshTimer();
	const deadline = new AbortController();
	const cancelTimer = startTimer(deadlineMs, () => deadline.abort());

	try {
		return await refreshExternalDataForGame(game, sources, {
			priority: "interactive",
			signal: deadline.signal
		});
	} finally {
		cancelTimer();
	}
}

export async function refreshExternalDataForGame(
	game: ExternalDataGame,
	sources: readonly ExternalDataSource[],
	options: ExternalDataRefreshOptions = {}
) {
	const externals = await gameExternalService.findByGameId(game.id);
	const externalIdOf = (source: ExternalSource) =>
		externals.find(external => external.source === source)?.externalId ??
		null;

	const results: ExternalDataResult[] = [];
	for (const source of sources) {
		if (options.signal?.aborted) {
			results.push(deadlineExceededResult(source));
			continue;
		}
		const result = await refreshSource(
			game,
			source,
			externalIdOf(source),
			options
		);
		await recordExternalDataAttempt(game.id, result);
		results.push(result);
	}
	return results;
}

function refreshSource(
	game: ExternalDataGame,
	source: ExternalDataSource,
	externalId: string | null,
	options: ExternalDataRefreshOptions
) {
	if (source === "metacritic")
		return refreshMetacritic(game, externalId, options);
	if (source === "hltb") return refreshHltb(game, externalId, options);
	return refreshIgdb(game, externalId, options);
}

async function recordExternalDataAttempt(
	gameId: string,
	result: ExternalDataResult
) {
	const status = externalDataAttemptStatus(result);
	if (status === null) return;
	if (status === "updated")
		await externalDataAttemptsService.clear(gameId, result.source);
	else
		await externalDataAttemptsService.record(gameId, result.source, status);
}

export async function findGamesMissingExternalData(
	now = new Date()
): Promise<ExternalDataCandidates> {
	const [
		games,
		gameIdsWithScore,
		gameIdsWithTime,
		gameIdsWithIgdbScore,
		attempts
	] = await Promise.all([
		findActiveGamesForExternalData(),
		gameScoresService.findGameIdsBySource(METACRITIC_SCORE_SOURCE),
		gameTimesService.findGameIdsBySource(HLTB_TIME_SOURCE),
		gameScoresService.findGameIdsBySource(IGDB_SCORE_SOURCE),
		externalDataAttemptsService.findAll()
	]);
	const hasScore = new Set(gameIdsWithScore);
	const hasTime = new Set(gameIdsWithTime);
	const hasIgdbScore = new Set(gameIdsWithIgdbScore);
	const attemptByKey = new Map(
		attempts.map(attempt => [
			attemptKey(attempt.gameId, attempt.source),
			attempt as ExternalDataAttemptRecord
		])
	);

	const pending: ExternalDataPendingCandidate[] = games
		.map(game => ({
			game: game.get({ plain: true }) as ExternalDataGame,
			missing: missingExternalDataSources(
				hasScore.has(game.id),
				hasTime.has(game.id),
				hasIgdbScore.has(game.id)
			)
		}))
		.filter(({ missing }) => missing.length > 0)
		.map(({ game, missing }) => {
			const sourceAttempts = missing.map(source => ({
				source,
				attempt: attemptByKey.get(attemptKey(game.id, source))
			}));
			const due = sourceAttempts.filter(
				({ attempt }) => !isCoolingDown(attempt, now)
			);
			return {
				game,
				sources: due.map(({ source }) => source),
				oldestAttemptedAt: oldestAttemptTime(
					due.map(({ attempt }) => attempt)
				)
			};
		});
	const candidates = pending
		.filter(({ sources }) => sources.length > 0)
		.sort(byOldestAttemptFirst)
		.map(({ game, sources }) => ({ game, sources }));

	return {
		candidates,
		completeCount: games.length - pending.length,
		recentlyAttemptedCount: pending.length - candidates.length
	};
}

function byOldestAttemptFirst(
	a: ExternalDataPendingCandidate,
	b: ExternalDataPendingCandidate
) {
	if (a.oldestAttemptedAt === b.oldestAttemptedAt) return 0;
	return a.oldestAttemptedAt < b.oldestAttemptedAt ? -1 : 1;
}

function attemptKey(gameId: string, source: ExternalDataSource) {
	return `${gameId}:${source}`;
}

function oldestAttemptTime(
	attempts: (ExternalDataAttemptRecord | undefined)[]
) {
	return Math.min(
		...attempts.map(attempt =>
			attempt ? attempt.attemptedAt.getTime() : Number.NEGATIVE_INFINITY
		)
	);
}

export async function findExternalDataCandidate(
	gameId: string
): Promise<ExternalDataCandidate | null> {
	const game = await findGameById(gameId);
	if (!game) return null;

	return {
		game: game.get({ plain: true }) as ExternalDataGame,
		sources: missingExternalDataSources(
			game.GameScores.some(
				score => score.source === METACRITIC_SCORE_SOURCE
			),
			game.GameTimes.some(time => time.source === HLTB_TIME_SOURCE),
			game.GameScores.some(score => score.source === IGDB_SCORE_SOURCE)
		)
	};
}

function missingExternalDataSources(
	hasMetacriticScore: boolean,
	hasHltbTime: boolean,
	hasIgdbScore: boolean
): ExternalDataSource[] {
	const missing: ExternalDataSource[] = [
		...(hasMetacriticScore ? [] : (["metacritic"] as const)),
		...(hasHltbTime ? [] : (["hltb"] as const)),
		...(hasIgdbScore ? [] : (["igdb"] as const))
	];
	return missing.filter(isExternalDataSourceTracked);
}

function failedResult(
	source: ExternalDataSource,
	errorCode: string | null
): ExternalDataResult {
	return { source, status: "failed", errorCode };
}

function deadlineExceededResult(source: ExternalDataSource) {
	return failedResult(source, EXTERNAL_DATA_DEADLINE_EXCEEDED);
}

async function refreshMetacritic(
	game: ExternalDataGame,
	externalId: string | null,
	options: ExternalDataRequestOptions
): Promise<ExternalDataResult> {
	const metacritic = getMetacriticSource();
	if (!metacritic)
		return failedResult("metacritic", EXTERNAL_DATA_SOURCE_UNAVAILABLE);

	let lookup: MetacriticLookup;
	try {
		lookup = externalId
			? {
					status: "matched",
					detail: await untilAborted(
						metacritic.getGameBySlug(externalId, options),
						options.signal
					),
					isNewMatch: false
				}
			: await findMetacriticMatch(game, metacritic, options);
	} catch (error) {
		if (options.signal?.aborted)
			return deadlineExceededResult("metacritic");
		return { source: "metacritic", ...classifyExternalDataError(error) };
	}

	if (lookup.status !== "matched")
		return { source: "metacritic", status: lookup.status, errorCode: null };

	const { detail } = lookup;
	if (options.signal?.aborted) return deadlineExceededResult("metacritic");
	if (lookup.isNewMatch)
		await saveExternalId(game.id, "metacritic", detail.slug);

	const rawScores = {
		metaScore: detail.metaScore ?? null,
		userScore: detail.userScore ?? null
	};
	const score = pickMetacriticScore(rawScores.metaScore, rawScores.userScore);
	if (score === null)
		return {
			source: "metacritic",
			status: "no_data",
			...rawScores,
			errorCode: null
		};

	if (options.signal?.aborted) return deadlineExceededResult("metacritic");
	await gameScoresService.upsertScore(
		game.id,
		METACRITIC_SCORE_SOURCE,
		score
	);
	return {
		source: "metacritic",
		status: "updated",
		score,
		...rawScores,
		errorCode: null
	};
}

async function findMetacriticMatch(
	game: ExternalDataGame,
	metacritic: MetacriticSource,
	options: ExternalDataRequestOptions
): Promise<MetacriticLookup> {
	for (const candidate of buildMetacriticSlugCandidates(
		game.title,
		game.variant
	)) {
		const detail = await fetchUnlessNotFound(() =>
			untilAborted(
				metacritic.getGameBySlug(candidate.slug, options),
				options.signal
			)
		);
		if (!detail) continue;
		return matchMetacriticDetail(game, candidate, detail);
	}
	return { status: "not_found" };
}

function matchMetacriticDetail(
	game: ExternalDataGame,
	candidate: MetacriticSlugCandidate,
	detail: MetacriticSourceDetail
): MetacriticLookup {
	if (
		normalizeGameTitle(detail.title) !== normalizeGameTitle(candidate.title)
	)
		return { status: "not_found" };
	if (isReleaseYearMismatch(game.releaseAt, detail.releaseYear))
		return { status: "ambiguous" };
	return {
		status: "matched",
		detail: { ...detail, slug: detail.slug || candidate.slug },
		isNewMatch: true
	};
}

async function fetchUnlessNotFound<T>(fetchDetail: () => Promise<T>) {
	try {
		return await fetchDetail();
	} catch (error) {
		if (classifyExternalDataError(error).status === "not_found")
			return null;
		throw error;
	}
}

async function refreshHltb(
	game: ExternalDataGame,
	externalId: string | null,
	options: ExternalDataRefreshOptions
): Promise<ExternalDataResult> {
	const hltb = getHltbSource();
	if (!hltb) return failedResult("hltb", EXTERNAL_DATA_SOURCE_UNAVAILABLE);
	if (!externalId && options.resolveHltbId === false)
		return failedResult("hltb", HLTB_ID_LOOKUP_PAUSED);

	let lookup: HltbLookup;
	try {
		lookup = externalId
			? {
					status: "matched",
					detail: await untilAborted(
						hltb.getGameById(externalId, options),
						options.signal
					),
					isNewMatch: false
				}
			: await findHltbMatch(game, hltb, options);
	} catch (error) {
		if (options.signal?.aborted) return deadlineExceededResult("hltb");
		return { source: "hltb", ...classifyExternalDataError(error) };
	}

	if (lookup.status !== "matched")
		return { source: "hltb", status: lookup.status, errorCode: null };

	const { detail } = lookup;
	if (options.signal?.aborted) return deadlineExceededResult("hltb");
	if (lookup.isNewMatch) await saveExternalId(game.id, "hltb", detail.id);

	const { mainStoryHours } = detail;
	if (
		mainStoryHours === null ||
		!Number.isFinite(mainStoryHours) ||
		mainStoryHours <= 0
	)
		return { source: "hltb", status: "no_data", errorCode: null };

	if (options.signal?.aborted) return deadlineExceededResult("hltb");
	await gameTimesService.upsertTime(
		game.id,
		HLTB_TIME_SOURCE,
		mainStoryHours
	);
	return {
		source: "hltb",
		status: "updated",
		duration: mainStoryHours,
		errorCode: null
	};
}

async function findHltbMatch(
	game: ExternalDataGame,
	hltb: HltbSource,
	options: ExternalDataRequestOptions
): Promise<HltbLookup> {
	const resolver = getHltbIdResolver();
	if (!resolver) return { status: "not_found" };

	const candidates = await untilAborted(
		resolver.findHltbCandidates(
			{ rawgSlug: game.code?.trim() || null, title: game.title },
			options
		),
		options.signal
	);
	const resolution = resolveHltbId(game, candidates);
	if (resolution.status !== "resolved") return resolution;

	const detail = await untilAborted(
		hltb.getGameById(resolution.hltbId, options),
		options.signal
	);
	if (
		resolution.matchedBy === "label" &&
		normalizeGameTitle(detail.title) !== normalizeGameTitle(game.title)
	)
		return { status: "ambiguous" };

	return {
		status: "matched",
		detail: { ...detail, id: detail.id || resolution.hltbId },
		isNewMatch: true
	};
}

async function refreshIgdb(
	game: ExternalDataGame,
	externalId: string | null,
	options: ExternalDataRequestOptions
): Promise<ExternalDataResult> {
	const igdb = getIgdbSource();
	if (!igdb) return failedResult("igdb", EXTERNAL_DATA_SOURCE_UNAVAILABLE);

	let lookup: IgdbLookup;
	try {
		lookup = externalId
			? await findIgdbGameById(igdb, externalId, options)
			: await findIgdbMatch(game, igdb, options);
	} catch (error) {
		if (options.signal?.aborted) return deadlineExceededResult("igdb");
		return { source: "igdb", ...classifyExternalDataError(error) };
	}

	if (lookup.status !== "matched")
		return { source: "igdb", status: lookup.status, errorCode: null };

	const { detail } = lookup;
	if (options.signal?.aborted) return deadlineExceededResult("igdb");
	if (lookup.isNewMatch)
		await saveExternalId(game.id, "igdb", String(detail.id));

	const score = extractIgdbUserRating(detail);
	if (score === null)
		return { source: "igdb", status: "no_data", errorCode: null };

	if (options.signal?.aborted) return deadlineExceededResult("igdb");
	await gameScoresService.upsertScore(game.id, IGDB_SCORE_SOURCE, score);
	return { source: "igdb", status: "updated", score, errorCode: null };
}

async function requestIgdb<T>(
	request: () => Promise<T>,
	options: ExternalDataRequestOptions
) {
	await getIgdbRequestPacer().waitForTurn(options.signal);
	return untilAborted(request(), options.signal);
}

async function findIgdbGameById(
	igdb: IgdbSource,
	externalId: string,
	options: ExternalDataRequestOptions
): Promise<IgdbLookup> {
	if (!IGDB_ID_PATTERN.test(externalId)) return { status: "not_found" };
	const detail = await requestIgdb(
		() => igdb.getGameById(Number(externalId)),
		options
	);
	return { status: "matched", detail, isNewMatch: false };
}

async function findIgdbMatch(
	game: ExternalDataGame,
	igdb: IgdbSource,
	options: ExternalDataRequestOptions
): Promise<IgdbLookup> {
	if (normalizeGameTitle(game.title) === "") return { status: "not_found" };

	const slug = game.code?.trim();
	if (slug) {
		const bySlug = await fetchUnlessNotFound(() =>
			requestIgdb(() => igdb.getGameBySlug(slug), options)
		);
		if (bySlug && isIgdbMatch(game, bySlug))
			return { status: "matched", detail: bySlug, isNewMatch: true };
	}

	const results = await requestIgdb(
		() => igdb.searchGame(game.title, { limit: IGDB_SEARCH_LIMIT }),
		options
	);
	const matches = distinctIgdbGames(
		results.filter(result => isIgdbMatch(game, result))
	);
	if (matches.length === 1)
		return { status: "matched", detail: matches[0]!, isNewMatch: true };
	if (matches.length > 1) return { status: "ambiguous" };
	return { status: "not_found" };
}

function isIgdbMatch(game: ExternalDataGame, detail: IgdbGame) {
	return (
		Number.isSafeInteger(detail.id) &&
		detail.id > 0 &&
		typeof detail.name === "string" &&
		normalizeGameTitle(detail.name) === normalizeGameTitle(game.title) &&
		!isReleaseYearMismatch(game.releaseAt, igdbReleaseYear(detail))
	);
}

function igdbReleaseYear(detail: IgdbGame) {
	const releaseDate = detail.first_release_date;
	if (typeof releaseDate !== "number" || !Number.isFinite(releaseDate))
		return null;
	return new Date(releaseDate * 1000).getUTCFullYear();
}

function distinctIgdbGames(games: IgdbGame[]) {
	return [...new Map(games.map(game => [game.id, game])).values()];
}

async function saveExternalId(
	gameId: string,
	source: ExternalSource,
	externalId: string
) {
	try {
		await gameExternalService.upsert(gameId, source, externalId);
	} catch (error) {
		if (!isConcurrentExternalInsert(error)) throw error;
		await gameExternalService.upsert(gameId, source, externalId);
	}
}

function isConcurrentExternalInsert(error: unknown) {
	return (
		error instanceof ServiceError &&
		error.code === "GAME_EXTERNAL_UNIQUE_CONSTRAINT"
	);
}
