import { Op } from "sequelize";
import { Job } from "./job.model";
import * as gamesService from "../games/games.service";
import * as gameExternalService from "../game-external/game-external.service";
import * as gameScoresService from "../game-scores/game-scores.service";
import * as gameTimesService from "../game-times/game-times.service";
import * as reviewsService from "../reviews/reviews.service";
import * as backlogService from "../backlog/backlog.service";
import * as usersService from "../users/users.service";
import * as gamePopularityService from "../game-popularity/game-popularity.service";
import { RawgProvider } from "../rawg/rawg.provider";
import { apiKeysConfig } from "../common/config/api-keys.config";

const MIN_THRESHOLD_PERCENT = 0.1;

export async function findAll() {
	return Job.findAll({ order: [["createdAt", "DESC"]], limit: 20 });
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

// --- Populate RAWG IDs ---

export async function startPopulateRawg(limit?: number) {
	return startJob("populate_rawg", jobId => runPopulateRawg(jobId, limit));
}

async function runPopulateRawg(jobId: string, limit?: number) {
	const rawg = new RawgProvider(apiKeysConfig.RAWG_API_KEY);
	let processed = 0;
	let errors = 0;

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
					`Cancelled after ${processed} processed. Errors: ${errors}`
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
			} catch {
				errors++;
			}
			await new Promise(r => setTimeout(r, 1100));
		}

		await completeJob(
			jobId,
			`Processed: ${processed}, Errors: ${errors}, Skipped: ${hasRawg.size}, Total: ${allGames.length}`
		);
	} catch {
		await failJob(
			jobId,
			`Failed after ${processed} processed. Errors: ${errors}`
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

// --- Recompute popularity (COUNT DISTINCT users in GameShelf per game) ---

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

// --- Calculate Durations (backlog realDuration → GameTime completr) ---

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
