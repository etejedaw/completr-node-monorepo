import { ServiceError } from "../../common/errors/service-error";
import { type ExternalSource } from "../../game-external/game-external.model";
import * as gameExternalService from "../../game-external/game-external.service";
import * as gameScoresService from "../../game-scores/game-scores.service";
import * as gameTimesService from "../../game-times/game-times.service";
import * as gamesServiceError from "../errors/games.service-error";
import { type ExternalDataSource } from "../games.constants";
import {
	type ExternalDataCandidate,
	type ExternalDataCandidates,
	type ExternalDataGame,
	type ExternalDataResult,
	type HltbSource,
	type MetacriticSlugCandidate,
	type MetacriticSource,
	type MetacriticSourceDetail
} from "../games-external-data.interface";
import {
	type HltbLookup,
	type MetacriticLookup
} from "../games-external-data.types";
import { buildMetacriticSlugCandidates } from "../utils/build-metacritic-slug-candidates.util";
import { classifyExternalDataError } from "../utils/classify-external-data-error.util";
import { isReleaseYearMismatch } from "../utils/is-release-year-mismatch.util";
import { normalizeGameTitle } from "../utils/normalize-game-title.util";
import { pickMetacriticScore } from "../utils/pick-metacritic-score.util";
import { resolveHltbId } from "../utils/resolve-hltb-id.util";
import {
	findUnavailableSources,
	getHltbIdResolver,
	getHltbSource,
	getMetacriticSource
} from "./external-data-sources.service";
import {
	findActiveGamesForExternalData,
	findGameById
} from "./games-search.service";

const SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE";
const METACRITIC_SCORE_SOURCE = "metacritic";
const HLTB_TIME_SOURCE = "hltb";

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

	const results = await refreshExternalDataForGame(game, sources);
	const refreshedGame = await findGameById(gameId);
	return { game: refreshedGame ?? game, results };
}

export async function refreshExternalDataForGame(
	game: ExternalDataGame,
	sources: readonly ExternalDataSource[]
) {
	const externals = await gameExternalService.findByGameId(game.id);
	const externalIdOf = (source: ExternalSource) =>
		externals.find(external => external.source === source)?.externalId ??
		null;

	const results: ExternalDataResult[] = [];
	for (const source of sources) {
		results.push(
			source === "metacritic"
				? await refreshMetacritic(game, externalIdOf("metacritic"))
				: await refreshHltb(game, externalIdOf("hltb"))
		);
	}
	return results;
}

export async function findGamesMissingExternalData(): Promise<ExternalDataCandidates> {
	const [games, gameIdsWithScore, gameIdsWithTime] = await Promise.all([
		findActiveGamesForExternalData(),
		gameScoresService.findGameIdsBySource(METACRITIC_SCORE_SOURCE),
		gameTimesService.findGameIdsBySource(HLTB_TIME_SOURCE)
	]);
	const hasScore = new Set(gameIdsWithScore);
	const hasTime = new Set(gameIdsWithTime);

	const candidates = games
		.map(game => ({
			game: game.get({ plain: true }) as ExternalDataGame,
			sources: missingExternalDataSources(
				hasScore.has(game.id),
				hasTime.has(game.id)
			)
		}))
		.filter(candidate => candidate.sources.length > 0);

	return { candidates, completeCount: games.length - candidates.length };
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
			game.GameTimes.some(time => time.source === HLTB_TIME_SOURCE)
		)
	};
}

function missingExternalDataSources(
	hasMetacriticScore: boolean,
	hasHltbTime: boolean
): ExternalDataSource[] {
	return [
		...(hasMetacriticScore ? [] : (["metacritic"] as const)),
		...(hasHltbTime ? [] : (["hltb"] as const))
	];
}

function failedResult(
	source: ExternalDataSource,
	errorCode: string | null
): ExternalDataResult {
	return { source, status: "failed", errorCode };
}

async function refreshMetacritic(
	game: ExternalDataGame,
	externalId: string | null
): Promise<ExternalDataResult> {
	const metacritic = getMetacriticSource();
	if (!metacritic) return failedResult("metacritic", SOURCE_UNAVAILABLE);

	let lookup: MetacriticLookup;
	try {
		lookup = externalId
			? {
					status: "matched",
					detail: await metacritic.getGameBySlug(externalId),
					isNewMatch: false
				}
			: await findMetacriticMatch(game, metacritic);
	} catch (error) {
		return { source: "metacritic", ...classifyExternalDataError(error) };
	}

	if (lookup.status !== "matched")
		return { source: "metacritic", status: lookup.status, errorCode: null };

	const { detail } = lookup;
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
	metacritic: MetacriticSource
): Promise<MetacriticLookup> {
	for (const candidate of buildMetacriticSlugCandidates(
		game.title,
		game.variant
	)) {
		const detail = await fetchUnlessNotFound(() =>
			metacritic.getGameBySlug(candidate.slug)
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
	externalId: string | null
): Promise<ExternalDataResult> {
	const hltb = getHltbSource();
	if (!hltb) return failedResult("hltb", SOURCE_UNAVAILABLE);

	let lookup: HltbLookup;
	try {
		lookup = externalId
			? {
					status: "matched",
					detail: await hltb.getGameById(externalId),
					isNewMatch: false
				}
			: await findHltbMatch(game, hltb);
	} catch (error) {
		return { source: "hltb", ...classifyExternalDataError(error) };
	}

	if (lookup.status !== "matched")
		return { source: "hltb", status: lookup.status, errorCode: null };

	const { detail } = lookup;
	if (lookup.isNewMatch) await saveExternalId(game.id, "hltb", detail.id);

	const { mainStoryHours } = detail;
	if (
		mainStoryHours === null ||
		!Number.isFinite(mainStoryHours) ||
		mainStoryHours <= 0
	)
		return { source: "hltb", status: "no_data", errorCode: null };

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
	hltb: HltbSource
): Promise<HltbLookup> {
	const resolver = getHltbIdResolver();
	if (!resolver) return { status: "not_found" };

	const candidates = await resolver.findHltbCandidates({
		rawgSlug: game.code?.trim() || null,
		title: game.title
	});
	const resolution = resolveHltbId(game, candidates);
	if (resolution.status !== "resolved") return resolution;

	const detail = await hltb.getGameById(resolution.hltbId);
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
