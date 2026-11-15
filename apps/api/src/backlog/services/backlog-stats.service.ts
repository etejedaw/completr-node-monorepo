import { col, fn, literal, Op, type Order } from "sequelize";

import { calculateRatio, RATIO_SCORE_MULTIPLIER } from "../../common/utils/calculate-ratio.util";
import { sequelize } from "../../database/sequelize.database";
import * as gamesService from "../../games/games.service";
import { type BacklogHighlight, type BacklogStats, type MonthlyCount, type RatingBucket } from "../backlog.interface";
import { Backlog } from "../backlog.model";
import { type BacklogQuery } from "../schemas/backlog-query.schema";
import { buildBacklogWhere } from "../utils/build-backlog-where.util";

export async function countBacklogByStatus(userId: string, publicOnly = false) {
	const where: Record<string, unknown> = { userId };
	if (publicOnly) where.isPublic = true;
	const rows = (await Backlog.findAll({
		where,
		attributes: [
			"status",
			[sequelize.fn("COUNT", sequelize.col("id")), "count"]
		],
		group: ["status"],
		raw: true
	})) as unknown as { status: string; count: string }[];

	const result = {
		not_started: 0,
		playing: 0,
		completed: 0,
		abandoned: 0,
		endless: 0,
		total: 0
	};
	for (const row of rows) {
		const n = Number(row.count);
		if (row.status in result) {
			result[row.status as keyof typeof result] = n;
		}
		result.total += n;
	}
	return result;
}

export async function countBacklogByStatusForUsers(
	owners: { userId: string; publicOnly: boolean }[]
) {
	const countsByUser = new Map(
		owners.map(owner => [
			owner.userId,
			{
				not_started: 0,
				playing: 0,
				completed: 0,
				abandoned: 0,
				endless: 0,
				total: 0
			}
		])
	);
	if (owners.length === 0) return countsByUser;

	const publicOnlyIds = owners
		.filter(owner => owner.publicOnly)
		.map(owner => owner.userId);
	const unrestrictedIds = owners
		.filter(owner => !owner.publicOnly)
		.map(owner => owner.userId);
	const ownerConditions: Record<string, unknown>[] = [];
	if (publicOnlyIds.length > 0)
		ownerConditions.push({
			userId: { [Op.in]: publicOnlyIds },
			isPublic: true
		});
	if (unrestrictedIds.length > 0)
		ownerConditions.push({ userId: { [Op.in]: unrestrictedIds } });

	const rows = (await Backlog.findAll({
		where: { [Op.or]: ownerConditions },
		attributes: [
			"userId",
			"status",
			[sequelize.fn("COUNT", sequelize.col("id")), "count"]
		],
		group: ["userId", "status"],
		raw: true
	})) as unknown as { userId: string; status: string; count: string }[];

	for (const row of rows) {
		const counts = countsByUser.get(row.userId);
		if (!counts) continue;
		const n = Number(row.count);
		if (row.status in counts) {
			counts[row.status as keyof typeof counts] = n;
		}
		counts.total += n;
	}
	return countsByUser;
}

const RATING_STARS = [5, 4, 3, 2, 1];

const RATING_MAX_STARS = 5;

const COMPLETION_TREND_MONTHS = 12;

const HIGHLIGHT_GAME_ATTRS = ["id", "code", "title", "backgroundUrl"];

async function findHighlight(
	baseWhere: Record<string, unknown>,
	extraWhere: Record<string, unknown>,
	order: Order
): Promise<Backlog | null> {
	return Backlog.findOne({
		where: { ...baseWhere, ...extraWhere },
		include: [{ ...gamesService.gameInclude(), attributes: HIGHLIGHT_GAME_ATTRS }],
		order
	});
}

function toHighlight(
	entry: Backlog | null,
	value: number | null
): BacklogHighlight | null {
	if (!entry || value === null) return null;
	return {
		backlogId: entry.id,
		game: {
			id: entry.Game.id,
			code: entry.Game.code,
			title: entry.Game.title,
			backgroundUrl: entry.Game.backgroundUrl ?? null
		},
		value
	};
}

function toNumberOrNull(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

async function countRatingsByStars(
	baseWhere: Record<string, unknown>
): Promise<RatingBucket[]> {
	const starsExpression = fn("LEAST", RATING_MAX_STARS, fn("CEIL", col("userRating")));
	const rows = (await Backlog.findAll({
		where: { [Op.and]: [baseWhere, { userRating: { [Op.gt]: 0 } }] },
		attributes: [
			[starsExpression, "stars"],
			[fn("COUNT", col("id")), "count"]
		],
		group: [starsExpression],
		raw: true
	})) as unknown as { stars: unknown; count: unknown }[];

	const countByStars = new Map(
		rows.map(row => [Number(row.stars), Number(row.count)])
	);
	return RATING_STARS.map(stars => ({
		stars,
		count: countByStars.get(stars) ?? 0
	}));
}

function toMonthKey(date: Date): string {
	return date.toISOString().slice(0, 7);
}

function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function monthStartsEndingAt(lastMonth: Date, count: number): Date[] {
	return Array.from(
		{ length: count },
		(_, index) =>
			new Date(
				Date.UTC(
					lastMonth.getUTCFullYear(),
					lastMonth.getUTCMonth() - (count - 1 - index),
					1
				)
			)
	);
}

async function findLatestCompletionDate(
	completedWhere: Record<string, unknown>
): Promise<Date | null> {
	const row = (await Backlog.findOne({
		where: completedWhere,
		attributes: [[fn("MAX", col("finishedAt")), "latest"]],
		raw: true
	})) as unknown as { latest: string | null } | null;
	return row?.latest ? new Date(`${row.latest}T00:00:00Z`) : null;
}

async function countCompletionsByMonth(
	baseWhere: Record<string, unknown>
): Promise<MonthlyCount[]> {
	const completedWhere = {
		[Op.and]: [
			baseWhere,
			{ status: "completed", finishedAt: { [Op.not]: null } }
		]
	};
	const latest = await findLatestCompletionDate(completedWhere);
	if (!latest) return [];

	const months = monthStartsEndingAt(latest, COMPLETION_TREND_MONTHS);
	const firstMonthStart = toDateOnly(months[0] ?? latest);
	const monthExpression = fn("TO_CHAR", col("finishedAt"), "YYYY-MM");
	const rows = (await Backlog.findAll({
		where: {
			[Op.and]: [
				completedWhere,
				{ finishedAt: { [Op.gte]: firstMonthStart } }
			]
		},
		attributes: [
			[monthExpression, "month"],
			[fn("COUNT", col("id")), "count"]
		],
		group: [monthExpression],
		raw: true
	})) as unknown as { month: string; count: unknown }[];

	const countByMonth = new Map(
		rows.map(row => [row.month, Number(row.count)])
	);
	return months.map(start => {
		const month = toMonthKey(start);
		return { month, count: countByMonth.get(month) ?? 0 };
	});
}

export async function computeBacklogStats(
	userId: string,
	filters: BacklogQuery
): Promise<BacklogStats> {
	const baseWhere = buildBacklogWhere({ userId }, filters);

	const row = (await Backlog.findOne({
		where: baseWhere,
		attributes: [
			[fn("COUNT", col("id")), "totalEntries"],
			[
				literal(`COUNT(*) FILTER (WHERE status = 'not_started')`),
				"notStarted"
			],
			[literal(`COUNT(*) FILTER (WHERE status = 'playing')`), "playing"],
			[
				literal(`COUNT(*) FILTER (WHERE status = 'completed')`),
				"completed"
			],
			[
				literal(`COUNT(*) FILTER (WHERE status = 'abandoned')`),
				"abandoned"
			],
			[literal(`COUNT(*) FILTER (WHERE status = 'endless')`), "endless"],
			[fn("SUM", col("realDuration")), "totalRealHours"],
			[fn("AVG", col("realDuration")), "avgRealDuration"],
			[fn("AVG", col("duration")), "avgEstimatedDuration"],
			[fn("AVG", col("score")), "avgScore"],
			[fn("AVG", col("userRating")), "avgUserRating"],
			[
				literal(
					`ROUND((AVG("Backlog"."score" / NULLIF("Backlog"."duration", 0)) * ${RATIO_SCORE_MULTIPLIER})::numeric, 2)`
				),
				"avgRatio"
			],
			[
				literal(
					`ROUND((AVG("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) * ${RATIO_SCORE_MULTIPLIER})::numeric, 2)`
				),
				"avgPersonalRatio"
			],
			[
				literal(
					`SUM("Backlog"."realDuration" - "Backlog"."duration") FILTER (WHERE status = 'completed')`
				),
				"estimatedVsRealDelta"
			]
		],
		raw: true
	})) as unknown as Record<string, unknown> | null;

	const safe = row ?? {};
	const totalEntries = Number(safe.totalEntries ?? 0);
	const completed = Number(safe.completed ?? 0);
	const abandoned = Number(safe.abandoned ?? 0);

	const [
		longestEntry,
		bestRatioEntry,
		highestRatedEntry,
		ratingDistribution,
		completionsByMonth
	] = await Promise.all([
		findHighlight(
			baseWhere,
			{ realDuration: { [Op.not]: null, [Op.gt]: 0 } },
			[literal(`"Backlog"."realDuration" DESC`)]
		),
		findHighlight(
			baseWhere,
			{
				realDuration: { [Op.not]: null, [Op.gt]: 0 },
				score: { [Op.not]: null, [Op.gt]: 0 }
			},
			[
				literal(
					`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) DESC NULLS LAST`
				)
			]
		),
		findHighlight(baseWhere, { userRating: { [Op.not]: null } }, [
			literal(`"Backlog"."userRating" DESC`)
		]),
		countRatingsByStars(baseWhere),
		countCompletionsByMonth(baseWhere)
	]);

	const bestPersonalRatioValue = bestRatioEntry
		? calculateRatio(bestRatioEntry.score, bestRatioEntry.realDuration)
		: null;

	return {
		totalEntries,
		countByStatus: {
			not_started: Number(safe.notStarted ?? 0),
			playing: Number(safe.playing ?? 0),
			completed,
			abandoned,
			endless: Number(safe.endless ?? 0)
		},
		totalRealHours: toNumberOrNull(safe.totalRealHours),
		avgRealDuration: toNumberOrNull(safe.avgRealDuration),
		avgEstimatedDuration: toNumberOrNull(safe.avgEstimatedDuration),
		avgScore: toNumberOrNull(safe.avgScore),
		avgUserRating: toNumberOrNull(safe.avgUserRating),
		avgRatio: toNumberOrNull(safe.avgRatio),
		avgPersonalRatio: toNumberOrNull(safe.avgPersonalRatio),
		estimatedVsRealDelta: toNumberOrNull(safe.estimatedVsRealDelta),
		completionRate: totalEntries > 0 ? completed / totalEntries : null,
		abandonmentRate: totalEntries > 0 ? abandoned / totalEntries : null,
		longestPlayed: toHighlight(
			longestEntry,
			longestEntry?.realDuration ?? null
		),
		bestPersonalRatio: toHighlight(bestRatioEntry, bestPersonalRatioValue),
		highestRated: toHighlight(
			highestRatedEntry,
			highestRatedEntry?.userRating ?? null
		),
		ratingDistribution,
		completionsByMonth
	};
}
