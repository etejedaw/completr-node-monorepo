import { Op } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Job } from "./job.model";
import { Game } from "../games/game.model";
import { GameExternal } from "../game-external/game-external.model";
import { GameScore } from "../game-scores/game-score.model";
import { GameTime } from "../game-times/game-time.model";
import { Review } from "../reviews/review.model";
import { Backlog } from "../backlog/backlog.model";
import { User } from "../users/user.model";
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
		const gamesWithExternal = await GameExternal.findAll({
			where: { source: "rawg" },
			attributes: ["gameId"]
		});
		const hasRawg = new Set(gamesWithExternal.map(e => e.gameId));

		const allGames = await Game.findAll({
			where: { isActive: true },
			attributes: ["id", "code"]
		});

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
					await GameExternal.create({
						gameId: game.id,
						source: "rawg",
						externalId: String(detail.id)
					});
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
		const totalUsers = await User.count({ where: { isActive: true } });
		const minReviews = Math.max(
			2,
			Math.ceil(totalUsers * MIN_THRESHOLD_PERCENT)
		);

		const results = (await Review.findAll({
			attributes: [
				"gameId",
				[sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
				[sequelize.fn("COUNT", sequelize.col("rating")), "reviewCount"]
			],
			where: { rating: { [Op.not]: null } },
			group: ["gameId"],
			raw: true
		})) as unknown as {
			gameId: string;
			avgRating: number;
			reviewCount: number;
		}[];

		for (const { gameId, avgRating, reviewCount } of results) {
			if (Number(reviewCount) < minReviews) {
				skipped++;
				continue;
			}
			const rounded = Math.round(avgRating * 100) / 100;
			await GameScore.upsert({
				gameId,
				source: "completr",
				score: rounded
			});
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

// --- Calculate Durations (backlog realDuration → GameTime completr) ---

export async function startCalculateDurations() {
	return startJob("calculate_durations", runCalculateDurations);
}

async function runCalculateDurations(jobId: string) {
	let updated = 0;
	let skipped = 0;

	try {
		const totalUsers = await User.count({ where: { isActive: true } });
		const minEntries = Math.max(
			2,
			Math.ceil(totalUsers * MIN_THRESHOLD_PERCENT)
		);

		const results = (await Backlog.findAll({
			attributes: [
				"gameId",
				[
					sequelize.fn("AVG", sequelize.col("realDuration")),
					"avgDuration"
				],
				[
					sequelize.fn("COUNT", sequelize.col("realDuration")),
					"entryCount"
				]
			],
			where: { realDuration: { [Op.not]: null, [Op.gt]: 0 } },
			group: ["gameId"],
			raw: true
		})) as unknown as {
			gameId: string;
			avgDuration: number;
			entryCount: number;
		}[];

		for (const { gameId, avgDuration, entryCount } of results) {
			if (Number(entryCount) < minEntries) {
				skipped++;
				continue;
			}
			const rounded = Math.round(avgDuration * 100) / 100;
			await GameTime.upsert({
				gameId,
				source: "completr",
				duration: rounded
			});
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
