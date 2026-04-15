import { Op } from "sequelize";
import { Job } from "./job.model";
import { Game } from "../games/game.model";
import { GameExternal } from "../game-external/game-external.model";
import { RawgProvider } from "../rawg/rawg.provider";
import { apiKeysConfig } from "../common/config/api-keys.config";

export async function findAll() {
	return Job.findAll({ order: [["createdAt", "DESC"]], limit: 20 });
}

export async function startPopulateRawg() {
	const existing = await Job.findOne({
		where: {
			type: "populate_rawg",
			status: { [Op.in]: ["pending", "running"] }
		}
	});
	if (existing) return existing;

	const job = await Job.create({ type: "populate_rawg", status: "running" });
	runPopulateRawg(job.id).catch(Function.prototype as () => void);
	return job;
}

async function runPopulateRawg(jobId: string) {
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

		const toProcess = allGames.filter(g => !hasRawg.has(g.id));

		for (const game of toProcess) {
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
			// Rate limit: ~1 req/sec
			await new Promise(r => setTimeout(r, 1100));
		}

		await Job.update(
			{
				status: "completed",
				result: `Processed: ${processed}, Errors: ${errors}, Skipped: ${hasRawg.size}`,
				completedAt: new Date()
			},
			{ where: { id: jobId } }
		);
	} catch {
		await Job.update(
			{
				status: "failed",
				result: `Failed after ${processed} processed. Errors: ${errors}`,
				completedAt: new Date()
			},
			{ where: { id: jobId } }
		);
	}
}
