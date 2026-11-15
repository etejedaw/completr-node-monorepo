import { Op } from "sequelize";

import { calculateRatio } from "../../common/utils/calculate-ratio.util";
import * as gamesService from "../../games/games.service";
import { COMPLETIONS_PAGE_SIZE, HIGHLIGHTS_RECENT_LIMIT } from "../backlog.constants";
import { Backlog, type BacklogStatus } from "../backlog.model";
import { buildBacklogInclude } from "../utils/build-backlog-include.util";


export async function findGameEntriesByStatus(
	userId: string,
	status: BacklogStatus,
	publicOnly: boolean,
	gameIds?: string[]
) {
	const where: Record<string, unknown> = { userId, status };
	if (publicOnly) where.isPublic = true;
	if (gameIds) where.gameId = { [Op.in]: gameIds };

	return Backlog.findAll({
		where,
		attributes: ["gameId"],
		include: [
			{
				...gamesService.gameInclude(),
				attributes: ["id", "code", "title", "backgroundUrl"]
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function findHighlightsByUserId(
	userId: string,
	includePrivate: boolean,
	options: { recentLimit?: number; year?: number; month?: number } = {}
) {
	const { recentLimit = HIGHLIGHTS_RECENT_LIMIT } = options;
	const now = new Date();
	const targetYear = options.year ?? now.getUTCFullYear();
	const targetMonth =
		options.month !== undefined ? options.month - 1 : now.getUTCMonth();
	const monthStart = new Date(Date.UTC(targetYear, targetMonth, 1));
	const monthEnd = new Date(
		Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)
	);

	const baseWhere: Record<string, unknown> = {
		userId,
		status: "completed",
		finishedAt: { [Op.ne]: null }
	};
	if (!includePrivate) baseWhere.isPublic = true;

	const recent = await Backlog.findAll({
		where: baseWhere,
		include: buildBacklogInclude(),
		order: [
			["finishedAt", "DESC"],
			["id", "DESC"]
		],
		limit: recentLimit
	});

	const monthEntries = await Backlog.findAll({
		where: {
			...baseWhere,
			finishedAt: { [Op.gte]: monthStart, [Op.lte]: monthEnd }
		},
		include: buildBacklogInclude(),
		order: [
			["finishedAt", "DESC"],
			["id", "DESC"]
		]
	});

	let longestPlayed: Backlog | null = null;
	let bestPersonalRatio: Backlog | null = null;
	let bestPersonalRatioValue = 0;
	let highestRated: Backlog | null = null;
	for (const entry of monthEntries) {
		if (
			entry.realDuration !== null &&
			entry.realDuration !== undefined &&
			(longestPlayed === null ||
				(longestPlayed.realDuration ?? 0) < entry.realDuration)
		) {
			longestPlayed = entry;
		}
		const personalRatio = calculateRatio(entry.score, entry.realDuration);
		if (personalRatio !== null && personalRatio > bestPersonalRatioValue) {
			bestPersonalRatio = entry;
			bestPersonalRatioValue = personalRatio;
		}
		if (
			entry.userRating !== null &&
			entry.userRating !== undefined &&
			(highestRated === null ||
				(highestRated.userRating ?? 0) < entry.userRating)
		) {
			highestRated = entry;
		}
	}

	return {
		recent,
		month: {
			startsAt: monthStart,
			endsAt: monthEnd,
			completedCount: monthEntries.length,
			longestPlayed,
			bestPersonalRatio,
			highestRated
		}
	};
}

export async function findCompletionsByUserIdPaginated(
	userId: string,
	includePrivate: boolean,
	options: { limit?: number; offset?: number } = {}
) {
	const { limit = COMPLETIONS_PAGE_SIZE, offset = 0 } = options;
	const where: Record<string, unknown> = {
		userId,
		status: "completed",
		finishedAt: { [Op.ne]: null }
	};
	if (!includePrivate) where.isPublic = true;

	const { rows, count } = await Backlog.findAndCountAll({
		where,
		include: buildBacklogInclude(),
		order: [
			["finishedAt", "DESC"],
			["id", "DESC"]
		],
		limit,
		offset,
		distinct: true
	});

	return { rows, total: count };
}
