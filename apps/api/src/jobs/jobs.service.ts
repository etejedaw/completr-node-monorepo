import { Op, type Transaction } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { environmentConfig } from "../common/config/environment.config";
import { ServiceError } from "../common/errors/service-error";
import { PinoLogger } from "../common/logger/pino.logger";
import { acquireAdvisoryLock } from "../common/utils/acquire-advisory-lock.util";
import { describeFailure } from "../common/utils/describe-failure.util";
import * as coopRunsService from "../coop-runs/coop-runs.service";
import { sequelize } from "../database/sequelize.database";
import * as gameExternalService from "../game-external/game-external.service";
import * as gamePopularityService from "../game-popularity/game-popularity.service";
import * as gameScoresService from "../game-scores/game-scores.service";
import * as gameTimesService from "../game-times/game-times.service";
import {
	EXTERNAL_DATA_UNRECORDED_FAILURE_PREFIX,
	EXTERNAL_DATA_UNRECORDED_FAILURE_SUFFIXES,
	HLTB_ID_LOOKUP_PAUSED,
	IGDB_AUTH_ERROR,
	IGDB_DISABLED,
	REQUIRED_EXTERNAL_DATA_SOURCES
} from "../games/games.constants";
import * as gamesService from "../games/games.service";
import { type ExternalDataResult } from "../games/games-external-data.interface";
import * as reviewsService from "../reviews/reviews.service";
import * as rewindFreezeService from "../rewind/services/rewind-freeze.service";
import * as usersService from "../users/services/users.service";
import * as jobsServiceError from "./errors/jobs.service-error";
import { Job } from "./job.model";
import {
	ACTIVE_JOB_STATUSES,
	INTERRUPTED_JOB_RESULT,
	JOB_TYPES,
	JOBS_LIST_LIMIT,
	MAX_CONSECUTIVE_TRANSIENT_FAILURES,
	MIN_COMMUNITY_SAMPLE_RATIO,
	MIN_COMMUNITY_SAMPLE_SIZE,
	RAWG_POPULATE_REQUEST_INTERVAL_MS,
	TALLY_KEY_BY_STATUS
} from "./jobs.constants";
import {
	type CommunityAggregate,
	type ExternalDataFailureStreaks,
	type ExternalDataJobReport,
	type ExternalDataSourceTally,
	type StartedJob
} from "./jobs.interface";
import { describeRewindFreezeReport } from "./utils/describe-rewind-freeze-report.util";

const logger = new PinoLogger("Jobs");

const EXTERNAL_DATA_STOP_CODES = [IGDB_AUTH_ERROR, IGDB_DISABLED];

export async function findAll() {
	return Job.findAll({
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		limit: JOBS_LIST_LIMIT
	});
}

async function findOrCreateActiveJob(
	type: string,
	transaction: Transaction
): Promise<StartedJob> {
	await acquireAdvisoryLock(`jobs:${type}`, transaction);
	const existing = await Job.findOne({
		where: { type, status: { [Op.in]: ACTIVE_JOB_STATUSES } },
		transaction
	});
	if (existing) return { job: existing, started: false };

	const job = await Job.create({ type, status: "running" }, { transaction });
	return { job, started: true };
}

async function startJob(
	type: string,
	runner: (jobId: string) => Promise<void>
): Promise<StartedJob> {
	const startedJob = await sequelize.transaction(transaction =>
		findOrCreateActiveJob(type, transaction)
	);
	if (startedJob.started)
		runner(startedJob.job.id).catch(ignoreRunnerFailure);
	return startedJob;
}

function ignoreRunnerFailure() {
	return undefined;
}

export async function failInterruptedJobs() {
	const [interruptedCount] = await Job.update(
		{
			status: "failed",
			result: INTERRUPTED_JOB_RESULT,
			completedAt: new Date()
		},
		{ where: { status: { [Op.in]: ACTIVE_JOB_STATUSES } } }
	);
	return interruptedCount;
}

async function completeJob(jobId: string, result: string) {
	await Job.update(
		{ status: "completed", result, completedAt: new Date() },
		{ where: { id: jobId } }
	);
}

async function isCancelled(jobId: string) {
	const job = await Job.findByPk(jobId);
	return job?.status === "cancelled";
}

export async function cancelJob(jobId: string) {
	const [cancelledCount] = await Job.update(
		{ status: "cancelled", completedAt: new Date() },
		{ where: { id: jobId, status: "running" } }
	);
	if (cancelledCount === 0) throw jobsServiceError.notFoundError();
}

async function failJob(jobId: string, result: string) {
	await Job.update(
		{ status: "failed", result, completedAt: new Date() },
		{ where: { id: jobId } }
	);
}

export async function startPopulateRawg(limit?: number) {
	gamesService.assertRawgEnabled();

	return startJob(JOB_TYPES.populateRawg, jobId =>
		runPopulateRawg(jobId, limit)
	);
}

function isRawgNotFound(error: unknown) {
	return error instanceof ServiceError && error.code === "RAWG_NOT_FOUND";
}

function pauseBetweenRawgRequests() {
	const intervalMs =
		environmentConfig.NODE_ENV === "test"
			? 0
			: RAWG_POPULATE_REQUEST_INTERVAL_MS;
	return new Promise(resolve => setTimeout(resolve, intervalMs));
}

async function runPopulateRawg(jobId: string, limit?: number) {
	let processed = 0;
	let notFound = 0;

	try {
		const gameIdsWithRawg =
			await gameExternalService.findGameIdsBySource("rawg");
		const hasRawg = new Set(gameIdsWithRawg);

		const allGames = await gamesService.findActiveGameSummaries();

		let toProcess = allGames.filter(game => !hasRawg.has(game.id));
		if (limit) toProcess = toProcess.slice(0, limit);

		for (const game of toProcess) {
			if (await isCancelled(jobId)) {
				await completeJob(
					jobId,
					`Cancelled after ${processed} processed. Not found: ${notFound}`
				);
				return;
			}
			try {
				const rawgId = await gamesService.findRawgIdBySlug(game.code);
				if (rawgId) {
					await gameExternalService.create(
						game.id,
						"rawg",
						String(rawgId)
					);
					processed++;
				}
			} catch (error) {
				if (!isRawgNotFound(error)) throw error;
				notFound++;
			}
			await pauseBetweenRawgRequests();
		}

		await completeJob(
			jobId,
			`Processed: ${processed}, Not found: ${notFound}, Skipped: ${hasRawg.size}, Total: ${allGames.length}`
		);
	} catch (error) {
		await failJob(
			jobId,
			`Failed after ${processed} processed, ${notFound} not found. Reason: ${describeFailure(error)}`
		);
	}
}

export async function startPopulateExternalData(limit?: number) {
	gamesService.assertExternalDataSourcesAvailable(
		REQUIRED_EXTERNAL_DATA_SOURCES
	);

	return startJob(JOB_TYPES.populateExternalData, jobId =>
		runPopulateExternalData(jobId, limit)
	);
}

async function settleRunningJob(
	jobId: string,
	status: "completed" | "failed",
	result: string
) {
	const [settled] = await Job.update(
		{ status, result, completedAt: new Date() },
		{ where: { id: jobId, status: "running" } }
	);
	if (settled === 0)
		await Job.update(
			{ result },
			{ where: { id: jobId, status: "cancelled" } }
		);
}

async function reportRunningProgress(jobId: string, progress: string) {
	await Job.update(
		{ result: `Running. ${progress}` },
		{ where: { id: jobId, status: "running" } }
	);
}

function emptyTally(): ExternalDataSourceTally {
	return { updated: 0, notFound: 0, ambiguous: 0, noData: 0, failed: 0 };
}

function emptyExternalDataReport(
	isIgdbTracked: boolean
): ExternalDataJobReport {
	return {
		candidates: 0,
		processed: 0,
		skippedComplete: 0,
		skippedRecentlyAttempted: 0,
		metacritic: emptyTally(),
		hltb: emptyTally(),
		igdb: isIgdbTracked ? emptyTally() : null,
		hltbIdLookupPausedReason: null,
		hltbSkippedWithoutId: 0
	};
}

function describeTally(label: string, tally: ExternalDataSourceTally) {
	return `${label} not found: ${tally.notFound}, ambiguous: ${tally.ambiguous}, no data: ${tally.noData}, failed: ${tally.failed}`;
}

function describeHltbIdLookupPause(report: ExternalDataJobReport) {
	return report.hltbIdLookupPausedReason === null
		? []
		: [
				`HLTB ID lookup paused: ${report.hltbIdLookupPausedReason}, HLTB skipped without ID: ${report.hltbSkippedWithoutId}`
			];
}

function describeIgdbUpdated(report: ExternalDataJobReport) {
	return report.igdb ? `, IGDB scores updated: ${report.igdb.updated}` : "";
}

function describeExternalDataReport(report: ExternalDataJobReport) {
	return [
		`Candidates: ${report.candidates}, Processed: ${report.processed}, Metacritic scores updated: ${report.metacritic.updated}, HLTB durations updated: ${report.hltb.updated}${describeIgdbUpdated(report)}, Skipped complete: ${report.skippedComplete}, Skipped recently attempted: ${report.skippedRecentlyAttempted}`,
		describeTally("Metacritic", report.metacritic),
		describeTally("HLTB", report.hltb),
		...(report.igdb ? [describeTally("IGDB", report.igdb)] : []),
		...describeHltbIdLookupPause(report)
	].join(". ");
}

function describeFailureDetail(result: ExternalDataResult) {
	const details = [
		...(result.httpStatus === undefined
			? []
			: [`HTTP ${result.httpStatus}`]),
		...(result.retryAfterSeconds === undefined
			? []
			: [`Retry-After ${result.retryAfterSeconds} s`])
	];
	return details.length > 0 ? ` (${details.join(", ")})` : "";
}

function isStopFailure(errorCode: string) {
	return (
		EXTERNAL_DATA_STOP_CODES.includes(errorCode) ||
		EXTERNAL_DATA_UNRECORDED_FAILURE_SUFFIXES.some(suffix =>
			errorCode.endsWith(suffix)
		)
	);
}

function isHltbIdLookupFailure(errorCode: string) {
	return errorCode.startsWith(EXTERNAL_DATA_UNRECORDED_FAILURE_PREFIX);
}

function failureReason(
	result: ExternalDataResult,
	errorCode: string,
	streak: number
) {
	if (isStopFailure(errorCode))
		return `${errorCode}${describeFailureDetail(result)}`;
	if (streak >= MAX_CONSECUTIVE_TRANSIENT_FAILURES)
		return `${errorCode} (${MAX_CONSECUTIVE_TRANSIENT_FAILURES} failures in a row)`;
	return null;
}

function tallyExternalDataResults(
	report: ExternalDataJobReport,
	results: ExternalDataResult[],
	streaks: ExternalDataFailureStreaks
) {
	let stopReason: string | null = null;
	for (const result of results) {
		if (result.errorCode === HLTB_ID_LOOKUP_PAUSED) {
			report.hltbSkippedWithoutId++;
			continue;
		}

		const tally = report[result.source];
		if (tally) tally[TALLY_KEY_BY_STATUS[result.status]]++;
		if (result.status !== "failed") {
			streaks[result.source] = 0;
			if (result.source === "hltb") streaks.wikidata = 0;
			continue;
		}

		const errorCode = result.errorCode ?? "UNKNOWN_ERROR";
		if (isHltbIdLookupFailure(errorCode)) {
			streaks.wikidata++;
			report.hltbIdLookupPausedReason ??= failureReason(
				result,
				errorCode,
				streaks.wikidata
			);
			continue;
		}

		streaks[result.source]++;
		stopReason ??= failureReason(result, errorCode, streaks[result.source]);
	}
	return stopReason;
}

async function stopExternalDataJob(
	jobId: string,
	report: ExternalDataJobReport,
	stopReason: string
) {
	logger.warn(JOB_TYPES.populateExternalData, "stopped", {
		jobId,
		stopReason
	});
	await settleRunningJob(
		jobId,
		"failed",
		`${describeExternalDataReport(report)}. Stopped: ${stopReason}`
	);
}

function warnIfHltbIdLookupJustPaused(
	jobId: string,
	report: ExternalDataJobReport,
	wasPaused: boolean
) {
	if (wasPaused || report.hltbIdLookupPausedReason === null) return;
	logger.warn(JOB_TYPES.populateExternalData, "HLTB ID lookup paused", {
		jobId,
		reason: report.hltbIdLookupPausedReason
	});
}

async function runPopulateExternalData(jobId: string, limit?: number) {
	const report = emptyExternalDataReport(
		gamesService.isExternalDataSourceTracked("igdb")
	);
	const streaks: ExternalDataFailureStreaks = {
		metacritic: 0,
		hltb: 0,
		igdb: 0,
		wikidata: 0
	};

	try {
		const { candidates, completeCount, recentlyAttemptedCount } =
			await gamesService.findGamesMissingExternalData();
		report.candidates = candidates.length;
		report.skippedComplete = completeCount;
		report.skippedRecentlyAttempted = recentlyAttemptedCount;

		const toProcess = limit ? candidates.slice(0, limit) : candidates;
		await reportRunningProgress(jobId, describeExternalDataReport(report));
		for (const { game, sources } of toProcess) {
			if (await isCancelled(jobId)) {
				await settleRunningJob(
					jobId,
					"completed",
					`Cancelled. ${describeExternalDataReport(report)}`
				);
				return;
			}

			const wasPaused = report.hltbIdLookupPausedReason !== null;
			const results = await gamesService.refreshExternalDataForGame(
				game,
				sources,
				{ resolveHltbId: !wasPaused }
			);
			report.processed++;

			const stopReason = tallyExternalDataResults(
				report,
				results,
				streaks
			);
			warnIfHltbIdLookupJustPaused(jobId, report, wasPaused);
			if (stopReason) {
				await stopExternalDataJob(jobId, report, stopReason);
				return;
			}
			await reportRunningProgress(
				jobId,
				describeExternalDataReport(report)
			);
		}

		await settleRunningJob(
			jobId,
			"completed",
			describeExternalDataReport(report)
		);
	} catch (error) {
		await stopExternalDataJob(jobId, report, describeFailure(error));
	}
}

export async function startCalculateRatings() {
	return startJob(JOB_TYPES.calculateRatings, runCalculateRatings);
}

async function runCalculateRatings(jobId: string) {
	await runCommunityAggregation(jobId, {
		sampleLabel: "reviews",
		loadAggregates: async () =>
			(await reviewsService.findAggregatedRatingsByGame()).map(
				({ gameId, avgRating, reviewCount }) => ({
					gameId,
					average: avgRating,
					count: Number(reviewCount)
				})
			),
		store: (gameId, value) =>
			gameScoresService.upsertScore(gameId, "completr", value)
	});
}

export async function startCalculateDurations() {
	return startJob(JOB_TYPES.calculateDurations, runCalculateDurations);
}

async function runCalculateDurations(jobId: string) {
	await runCommunityAggregation(jobId, {
		sampleLabel: "entries",
		loadAggregates: async () =>
			(await backlogService.findAggregatedRealDurationsByGame()).map(
				({ gameId, avgDuration, entryCount }) => ({
					gameId,
					average: avgDuration,
					count: Number(entryCount)
				})
			),
		store: (gameId, value) =>
			gameTimesService.upsertTime(gameId, "completr", value)
	});
}

async function runCommunityAggregation(
	jobId: string,
	aggregation: {
		sampleLabel: string;
		loadAggregates: () => Promise<CommunityAggregate[]>;
		store: (gameId: string, value: number) => Promise<unknown>;
	}
) {
	let updated = 0;
	let skipped = 0;

	try {
		const totalUsers = await usersService.countActiveUsers();
		const minimumSample = Math.max(
			MIN_COMMUNITY_SAMPLE_SIZE,
			Math.ceil(totalUsers * MIN_COMMUNITY_SAMPLE_RATIO)
		);

		for (const {
			gameId,
			average,
			count
		} of await aggregation.loadAggregates()) {
			if (count < minimumSample) {
				skipped++;
				continue;
			}
			await aggregation.store(gameId, Math.round(average * 100) / 100);
			updated++;
		}

		await completeJob(
			jobId,
			`Updated: ${updated}, Skipped: ${skipped} (min ${minimumSample} ${aggregation.sampleLabel}, ${totalUsers} users)`
		);
	} catch (error) {
		await failJob(
			jobId,
			`Failed after ${updated} updated. Reason: ${describeFailure(error)}`
		);
	}
}

export async function startCleanupCoopRuns() {
	return startJob(JOB_TYPES.cleanupCoopRuns, runCleanupCoopRuns);
}

async function runCleanupCoopRuns(jobId: string) {
	try {
		const removed = await coopRunsService.cleanupOrphanRuns();
		await completeJob(jobId, `Removed ${removed} orphan coop runs`);
	} catch (error) {
		await failJob(jobId, `Failed. Reason: ${describeFailure(error)}`);
	}
}

export async function startRecomputePopularity() {
	return startJob(JOB_TYPES.recomputePopularity, runRecomputePopularity);
}

async function runRecomputePopularity(jobId: string) {
	try {
		const total = await gamePopularityService.recomputeAllPopularity();
		await completeJob(jobId, `Recomputed popularity for ${total} games`);
	} catch (error) {
		await failJob(jobId, `Failed. Reason: ${describeFailure(error)}`);
	}
}

export async function startRewindFreeze() {
	return startJob(JOB_TYPES.rewindFreeze, runRewindFreeze);
}

async function runRewindFreeze(jobId: string) {
	try {
		const report = await rewindFreezeService.freezeClosedRewindEditions();
		const result = describeRewindFreezeReport(report);
		if (report.failed > 0) await failJob(jobId, result);
		else await completeJob(jobId, result);
	} catch (error) {
		await failJob(jobId, `Failed. Reason: ${describeFailure(error)}`);
	}
}
