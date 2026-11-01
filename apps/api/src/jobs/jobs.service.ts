import { Op } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { apiKeysConfig } from "../common/config/api-keys.config";
import { ServiceError } from "../common/errors/service-error";
import * as coopRunsService from "../coop-runs/coop-runs.service";
import * as gameExternalService from "../game-external/game-external.service";
import * as gamePopularityService from "../game-popularity/game-popularity.service";
import * as gameScoresService from "../game-scores/game-scores.service";
import * as gameTimesService from "../game-times/game-times.service";
import {
	EXTERNAL_DATA_SOURCES,
	type ExternalDataSource
} from "../games/games.constants";
import * as gamesService from "../games/games.service";
import { type ExternalDataResult } from "../games/games-external-data.interface";
import * as rawgServiceError from "../rawg/errors/rawg.service-error";
import { RawgClient } from "../rawg/rawg.provider";
import * as reviewsService from "../reviews/reviews.service";
import * as usersService from "../users/users.service";
import { Job } from "./job.model";
import {
	type ExternalDataJobReport,
	type ExternalDataSourceTally
} from "./jobs.interface";

const rawg = RawgClient.create(apiKeysConfig.RAWG_API_KEY);

const MIN_THRESHOLD_PERCENT = 0.1;
const EXTERNAL_DATA_STOP_SUFFIXES = [
	"_RATE_LIMITED",
	"_BLOCKED",
	"_PARSE_ERROR"
];
const MAX_CONSECUTIVE_TRANSIENT_FAILURES = 3;
const TALLY_KEY_BY_STATUS = {
	updated: "updated",
	not_found: "notFound",
	ambiguous: "ambiguous",
	no_data: "noData",
	failed: "failed"
} as const;

export async function findAll() {
	return Job.findAll({
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		limit: 20
	});
}

async function startJob(
	type: string,
	runner: (jobId: string) => Promise<void>
) {
	const existing = await Job.findOne({
		where: { type, status: { [Op.in]: ["pending", "running"] } }
	});
	if (existing) return existing;

	const job = await Job.create({ type, status: "running" });
	runner(job.id).catch(Function.prototype as () => void);
	return job;
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
	const job = await Job.findByPk(jobId);
	if (!job || job.status !== "running") return false;
	await job.update({ status: "cancelled", completedAt: new Date() });
	return true;
}

async function failJob(jobId: string, result: string) {
	await Job.update(
		{ status: "failed", result, completedAt: new Date() },
		{ where: { id: jobId } }
	);
}

export async function startPopulateRawg(limit?: number) {
	if (!rawg.isEnabled) throw rawgServiceError.disabledError();

	return startJob("populate_rawg", jobId => runPopulateRawg(jobId, limit));
}

function isRawgNotFound(error: unknown) {
	return error instanceof ServiceError && error.code === "RAWG_NOT_FOUND";
}

function describeFailure(error: unknown) {
	if (error instanceof ServiceError) {
		const { raw } = error.serviceError;
		return typeof raw === "string" ? `${error.code}: ${raw}` : error.code;
	}
	return error instanceof Error ? error.message : String(error);
}

async function runPopulateRawg(jobId: string, limit?: number) {
	let processed = 0;
	let notFound = 0;

	try {
		const gameIdsWithRawg =
			await gameExternalService.findGameIdsBySource("rawg");
		const hasRawg = new Set(gameIdsWithRawg);

		const allGames = await gamesService.findActiveGameSummaries();

		let toProcess = allGames.filter(g => !hasRawg.has(g.id));
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
				const detail = await rawg.getGameBySlug(game.code);
				if (detail?.id) {
					await gameExternalService.create(
						game.id,
						"rawg",
						String(detail.id)
					);
					processed++;
				}
			} catch (error) {
				if (!isRawgNotFound(error)) throw error;
				notFound++;
			}
			await new Promise(r => setTimeout(r, 1100));
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
	gamesService.assertExternalDataSourcesAvailable(EXTERNAL_DATA_SOURCES);

	return startJob("populate_external_data", jobId =>
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

function emptyTally(): ExternalDataSourceTally {
	return { updated: 0, notFound: 0, ambiguous: 0, noData: 0, failed: 0 };
}

function emptyExternalDataReport(): ExternalDataJobReport {
	return {
		candidates: 0,
		processed: 0,
		skippedComplete: 0,
		metacritic: emptyTally(),
		hltb: emptyTally()
	};
}

function describeTally(label: string, tally: ExternalDataSourceTally) {
	return `${label} not found: ${tally.notFound}, ambiguous: ${tally.ambiguous}, no data: ${tally.noData}, failed: ${tally.failed}`;
}

function describeExternalDataReport(report: ExternalDataJobReport) {
	return [
		`Candidates: ${report.candidates}, Processed: ${report.processed}, Metacritic scores updated: ${report.metacritic.updated}, HLTB durations updated: ${report.hltb.updated}, Skipped complete: ${report.skippedComplete}`,
		describeTally("Metacritic", report.metacritic),
		describeTally("HLTB", report.hltb)
	].join(". ");
}

function isStopFailure(result: ExternalDataResult) {
	return EXTERNAL_DATA_STOP_SUFFIXES.some(suffix =>
		result.errorCode?.endsWith(suffix)
	);
}

function tallyExternalDataResults(
	report: ExternalDataJobReport,
	results: ExternalDataResult[],
	consecutiveFailures: Record<ExternalDataSource, number>
) {
	let stopReason: string | null = null;
	for (const result of results) {
		report[result.source][TALLY_KEY_BY_STATUS[result.status]]++;
		if (result.status !== "failed") {
			consecutiveFailures[result.source] = 0;
			continue;
		}
		const errorCode = result.errorCode ?? "UNKNOWN_ERROR";
		if (isStopFailure(result)) stopReason ??= errorCode;
		consecutiveFailures[result.source]++;
		if (
			consecutiveFailures[result.source] >=
			MAX_CONSECUTIVE_TRANSIENT_FAILURES
		)
			stopReason ??= `${errorCode} (${MAX_CONSECUTIVE_TRANSIENT_FAILURES} failures in a row)`;
	}
	return stopReason;
}

async function runPopulateExternalData(jobId: string, limit?: number) {
	const report = emptyExternalDataReport();
	const consecutiveFailures = { metacritic: 0, hltb: 0 };

	try {
		const { candidates, completeCount } =
			await gamesService.findGamesMissingExternalData();
		report.candidates = candidates.length;
		report.skippedComplete = completeCount;

		const toProcess = limit ? candidates.slice(0, limit) : candidates;
		for (const { game, sources } of toProcess) {
			if (await isCancelled(jobId)) {
				await settleRunningJob(
					jobId,
					"completed",
					`Cancelled. ${describeExternalDataReport(report)}`
				);
				return;
			}

			const results = await gamesService.refreshExternalDataForGame(
				game,
				sources
			);
			report.processed++;

			const stopReason = tallyExternalDataResults(
				report,
				results,
				consecutiveFailures
			);
			if (stopReason) {
				await settleRunningJob(
					jobId,
					"failed",
					`${describeExternalDataReport(report)}. Stopped: ${stopReason}`
				);
				return;
			}
		}

		await settleRunningJob(
			jobId,
			"completed",
			describeExternalDataReport(report)
		);
	} catch (error) {
		await settleRunningJob(
			jobId,
			"failed",
			`${describeExternalDataReport(report)}. Stopped: ${describeFailure(error)}`
		);
	}
}

// --- Calculate Ratings (reviews → GameScore completr) ---

export async function startCalculateRatings() {
	return startJob("calculate_ratings", runCalculateRatings);
}

async function runCalculateRatings(jobId: string) {
	let updated = 0;
	let skipped = 0;

	try {
		const totalUsers = await usersService.countActiveUsers();
		const minReviews = Math.max(
			2,
			Math.ceil(totalUsers * MIN_THRESHOLD_PERCENT)
		);

		const results = await reviewsService.findAggregatedRatingsByGame();

		for (const { gameId, avgRating, reviewCount } of results) {
			if (Number(reviewCount) < minReviews) {
				skipped++;
				continue;
			}
			const rounded = Math.round(avgRating * 100) / 100;
			await gameScoresService.upsertScore(gameId, "completr", rounded);
			updated++;
		}

		await completeJob(
			jobId,
			`Updated: ${updated}, Skipped: ${skipped} (min ${minReviews} reviews, ${totalUsers} users)`
		);
	} catch {
		await failJob(jobId, `Failed after ${updated} updated`);
	}
}

export async function startCleanupCoopRuns() {
	return startJob("cleanup_coop_runs", runCleanupCoopRuns);
}

async function runCleanupCoopRuns(jobId: string) {
	try {
		const removed = await coopRunsService.cleanupOrphanRuns();
		await completeJob(jobId, `Removed ${removed} orphan coop runs`);
	} catch {
		await failJob(jobId, `Failed`);
	}
}

export async function startRecomputePopularity() {
	return startJob("recompute_popularity", runRecomputePopularity);
}

async function runRecomputePopularity(jobId: string) {
	try {
		const total = await gamePopularityService.recomputeAllPopularity();
		await completeJob(jobId, `Recomputed popularity for ${total} games`);
	} catch {
		await failJob(jobId, `Failed`);
	}
}

export async function startCalculateDurations() {
	return startJob("calculate_durations", runCalculateDurations);
}

async function runCalculateDurations(jobId: string) {
	let updated = 0;
	let skipped = 0;

	try {
		const totalUsers = await usersService.countActiveUsers();
		const minEntries = Math.max(
			2,
			Math.ceil(totalUsers * MIN_THRESHOLD_PERCENT)
		);

		const results =
			await backlogService.findAggregatedRealDurationsByGame();

		for (const { gameId, avgDuration, entryCount } of results) {
			if (Number(entryCount) < minEntries) {
				skipped++;
				continue;
			}
			const rounded = Math.round(avgDuration * 100) / 100;
			await gameTimesService.upsertTime(gameId, "completr", rounded);
			updated++;
		}

		await completeJob(
			jobId,
			`Updated: ${updated}, Skipped: ${skipped} (min ${minEntries} entries, ${totalUsers} users)`
		);
	} catch {
		await failJob(jobId, `Failed after ${updated} updated`);
	}
}
