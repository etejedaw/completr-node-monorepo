import {
	col,
	fn,
	literal,
	Op,
	type Order,
	QueryTypes,
	type Transaction
} from "sequelize";

import * as backlogProgressService from "../backlog-progress/backlog-progress.service";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { sequelize } from "../database/sequelize.database";
import * as gameShelfService from "../game-shelf/game-shelf.service";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import * as moodTagsService from "../mood-tags/mood-tags.service";
import { Platform } from "../platforms/platform.model";
import * as queueService from "../queue/queue.service";
import * as reviewsService from "../reviews/reviews.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import { User } from "../users/user.model";
import { Backlog, type BacklogStatus } from "./backlog.model";
import { type RegisterBacklogDto } from "./dtos/register-backlog.dto";
import { type UpdateBacklogDto } from "./dtos/update-backlog.dto";
import * as backlogServiceError from "./errors/backlog.service-error";
import { type BacklogQuery } from "./schemas/backlog-query.schema";
import { buildBacklogWhere } from "./utils/build-backlog-where.util";

const BACKLOG_GAME_ATTRS = ["id", "code", "title", "backgroundUrl", "isDlc"];
const BACKLOG_PLATFORM_ATTRS = ["id", "abbreviation"];

const backlogInclude = [
	{ model: Game, attributes: BACKLOG_GAME_ATTRS },
	{ model: Platform, attributes: BACKLOG_PLATFORM_ATTRS },
	{
		model: Game,
		as: "CompilationGame",
		attributes: BACKLOG_GAME_ATTRS,
		required: false
	}
];

async function assertCompilationContext(
	gameId: string,
	compilationGameId: string
) {
	if (!(await gamesService.existsActiveCompilation(compilationGameId)))
		throw backlogServiceError.compilationContextInvalidError();

	if (
		!(await gamesService.gameBelongsToCompilation(
			gameId,
			compilationGameId
		))
	)
		throw backlogServiceError.compilationContextInvalidError();
}

type BacklogFields = Omit<
	RegisterBacklogDto,
	"addToQueue" | "addToShelf" | "moodTags" | "review" | "progressNote"
>;

type BacklogReview = NonNullable<RegisterBacklogDto["review"]>;

export interface CreatedBacklog {
	backlog: Backlog;
	reviewCreated: boolean;
	addedToQueue: boolean;
	addedToShelf: boolean;
}

async function insertBacklog(
	userId: string,
	backlogFields: BacklogFields,
	transaction: Transaction
) {
	try {
		const backlogEntry = await Backlog.create(
			{ ...backlogFields, userId },
			{ transaction }
		);
		await backlogEntry.reload({ include: backlogInclude, transaction });
		return backlogEntry;
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: backlogServiceError.uniqueConstraintError,
			validation: backlogServiceError.validationError
		});
	}
}

async function createReviewIfMissing(
	userId: string,
	gameId: string,
	review: BacklogReview,
	transaction: Transaction
) {
	const existing = await reviewsService.findReviewByUserAndGame(
		userId,
		gameId,
		transaction
	);
	if (existing) return false;

	await reviewsService.createReview(userId, gameId, review, transaction);
	return true;
}

async function addToShelfIfMissing(
	user: RequestUser,
	backlogEntry: Backlog,
	transaction: Transaction
) {
	const { gameId, platformId } = backlogEntry;
	if (
		await gameShelfService.existsGameShelfEntry(
			user.id,
			gameId,
			platformId,
			transaction
		)
	)
		return false;

	await gameShelfService.registerGameShelf(
		user,
		{ gameId, platformId },
		transaction
	);
	return true;
}

export async function createBacklog(
	user: RequestUser,
	registerBacklog: RegisterBacklogDto
): Promise<CreatedBacklog> {
	const {
		addToQueue,
		addToShelf,
		moodTags,
		review,
		progressNote,
		...backlogFields
	} = registerBacklog;

	if (backlogFields.compilationGameId) {
		await assertCompilationContext(
			backlogFields.gameId,
			backlogFields.compilationGameId
		);
	}

	return sequelize.transaction(async transaction => {
		const backlogEntry = await insertBacklog(
			user.id,
			backlogFields,
			transaction
		);
		const { id, gameId } = backlogEntry;

		const reviewCreated = review
			? await createReviewIfMissing(user.id, gameId, review, transaction)
			: false;
		if (moodTags)
			await moodTagsService.replaceTags(
				user,
				gameId,
				moodTags,
				transaction
			);
		if (progressNote)
			await backlogProgressService.addProgress(
				user.id,
				id,
				progressNote,
				transaction
			);
		if (addToQueue)
			await queueService.addFromBacklog(id, user, transaction);
		const addedToShelf = addToShelf
			? await addToShelfIfMissing(user, backlogEntry, transaction)
			: false;

		return {
			backlog: backlogEntry,
			reviewCreated,
			addedToQueue: addToQueue === true,
			addedToShelf
		};
	});
}

export async function findBacklogById(id: string, transaction?: Transaction) {
	return Backlog.findOne({
		where: { id },
		include: backlogInclude,
		transaction
	});
}

export async function findBacklogBasicById(
	id: string,
	transaction?: Transaction
) {
	return Backlog.findOne({ where: { id }, transaction });
}

export async function findBacklogsByUserAndIds(userId: string, ids: string[]) {
	if (ids.length === 0) return [];
	return Backlog.findAll({ where: { id: ids, userId } });
}

export async function findGameIdsInBacklogByUser(
	userId: string,
	gameIds: string[]
) {
	if (gameIds.length === 0) return [];
	const rows = await Backlog.findAll({
		where: { userId, gameId: gameIds },
		attributes: ["gameId"],
		group: ["gameId"]
	});
	return rows.map(row => row.gameId);
}

export interface BacklogSummary {
	gameId: string;
	status: string;
	score: number | null;
	realDuration: number | null;
}

export async function findBacklogSummariesByUserAndGameIds(
	userId: string,
	gameIds: string[],
	publicOnly = false
): Promise<BacklogSummary[]> {
	if (gameIds.length === 0) return [];

	return sequelize.query<BacklogSummary>(
		`SELECT DISTINCT ON ("gameId") "gameId", status, score, "realDuration"
		 FROM "Backlogs"
		 WHERE "userId" = :userId AND "gameId" IN (:gameIds)${
				publicOnly ? ` AND "isPublic" = true` : ""
			}
		 ORDER BY "gameId",
		   CASE status
		     WHEN 'completed' THEN 1
		     WHEN 'playing' THEN 2
		     WHEN 'endless' THEN 2
		     WHEN 'abandoned' THEN 3
		     WHEN 'not_started' THEN 4
		   END,
		   "createdAt" DESC`,
		{
			replacements: { userId, gameIds },
			type: QueryTypes.SELECT
		}
	);
}

export async function countDistinctGamesByUserStatusAndGameIds(
	userId: string,
	gameIds: string[],
	statuses: string[],
	publicOnly = false
) {
	if (gameIds.length === 0 || statuses.length === 0) return 0;
	const where: Record<string, unknown> = {
		userId,
		gameId: { [Op.in]: gameIds },
		status: { [Op.in]: statuses }
	};
	if (publicOnly) where.isPublic = true;
	return Backlog.count({ where, distinct: true, col: "gameId" });
}

export async function findDistinctGameIdsByUserAndStatuses(
	userId: string,
	statuses: string[],
	publicOnly = false
) {
	if (statuses.length === 0) return [];
	const where: Record<string, unknown> = {
		userId,
		status: { [Op.in]: statuses }
	};
	if (publicOnly) where.isPublic = true;

	const rows = (await Backlog.findAll({
		where,
		attributes: [[fn("DISTINCT", col("gameId")), "gameId"]],
		raw: true
	})) as unknown as { gameId: string }[];
	return rows.map(row => row.gameId);
}

export async function findAggregatedRealDurationsByGame() {
	return (await Backlog.findAll({
		attributes: [
			"gameId",
			[sequelize.fn("AVG", sequelize.col("realDuration")), "avgDuration"],
			[sequelize.fn("COUNT", sequelize.col("realDuration")), "entryCount"]
		],
		where: { realDuration: { [Op.not]: null, [Op.gt]: 0 } },
		group: ["gameId"],
		raw: true
	})) as unknown as {
		gameId: string;
		avgDuration: number;
		entryCount: number;
	}[];
}

export async function createNotStartedBacklog(
	userId: string,
	gameId: string,
	platformId: string,
	transaction: Transaction
) {
	return Backlog.create(
		{ userId, gameId, platformId, status: "not_started" },
		{ transaction }
	);
}

function buildIncludes(filters: BacklogQuery) {
	const gameInclude: Record<string, unknown> = {
		model: Game,
		attributes: BACKLOG_GAME_ATTRS
	};
	if (filters.search) {
		gameInclude.where = {
			title: { [Op.iLike]: `%${filters.search}%` }
		};
	}
	return [
		gameInclude,
		{ model: Platform, attributes: BACKLOG_PLATFORM_ATTRS },
		{
			model: Game,
			as: "CompilationGame",
			attributes: BACKLOG_GAME_ATTRS,
			required: false
		}
	];
}

const NULLABLE_SORT_FIELDS = new Set([
	"startedAt",
	"finishedAt",
	"realDuration",
	"userRating",
	"score",
	"duration"
]);

function buildOrder(filters: BacklogQuery): Order {
	const sortBy = filters.sort_by ?? "createdAt";
	const sortOrder = (filters.sort_order ?? "desc").toUpperCase() as
		"ASC" | "DESC";

	if (sortBy === "title") {
		return [[Game, "title", sortOrder]];
	}
	if (sortBy === "ratio") {
		return [
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."duration", 0)) ${sortOrder} NULLS LAST`
			)
		];
	}
	if (sortBy === "personalRatio") {
		return [
			literal(
				`("Backlog"."score" / NULLIF("Backlog"."realDuration", 0)) ${sortOrder} NULLS LAST`
			)
		];
	}
	if (NULLABLE_SORT_FIELDS.has(sortBy)) {
		return [literal(`"Backlog"."${sortBy}" ${sortOrder} NULLS LAST`)];
	}
	return [[sortBy, sortOrder]];
}

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

export interface BacklogHighlightGame {
	id: string;
	code: string;
	title: string;
	backgroundUrl: string | null;
}

export interface BacklogHighlight {
	backlogId: string;
	game: BacklogHighlightGame;
	value: number;
}

export interface BacklogStats {
	totalEntries: number;
	countByStatus: {
		not_started: number;
		playing: number;
		completed: number;
		abandoned: number;
		endless: number;
	};
	totalRealHours: number | null;
	avgRealDuration: number | null;
	avgEstimatedDuration: number | null;
	avgScore: number | null;
	avgUserRating: number | null;
	avgRatio: number | null;
	avgPersonalRatio: number | null;
	estimatedVsRealDelta: number | null;
	completionRate: number | null;
	abandonmentRate: number | null;
	longestPlayed: BacklogHighlight | null;
	bestPersonalRatio: BacklogHighlight | null;
	highestRated: BacklogHighlight | null;
	ratingDistribution: RatingBucket[];
	completionsByMonth: MonthlyCount[];
}

export interface RatingBucket {
	stars: number;
	count: number;
}

export interface MonthlyCount {
	month: string;
	count: number;
}

const RATING_STARS = [5, 4, 3, 2, 1];
const COMPLETION_TREND_MONTHS = 12;

const HIGHLIGHT_GAME_ATTRS = ["id", "code", "title", "backgroundUrl"];

async function findHighlight(
	baseWhere: Record<string, unknown>,
	extraWhere: Record<string, unknown>,
	order: Order
): Promise<Backlog | null> {
	return Backlog.findOne({
		where: { ...baseWhere, ...extraWhere },
		include: [{ model: Game, attributes: HIGHLIGHT_GAME_ATTRS }],
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
	const starsExpression = fn("LEAST", 5, fn("CEIL", col("userRating")));
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
					`AVG("Backlog"."score" / NULLIF("Backlog"."duration", 0))`
				),
				"avgRatio"
			],
			[
				literal(
					`AVG("Backlog"."score" / NULLIF("Backlog"."realDuration", 0))`
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

	const bestPersonalRatioValue =
		bestRatioEntry &&
		bestRatioEntry.score !== null &&
		bestRatioEntry.score !== undefined &&
		bestRatioEntry.realDuration
			? bestRatioEntry.score / bestRatioEntry.realDuration
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

export async function findBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	const query: Record<string, unknown> = {
		where: buildBacklogWhere({ userId }, filters),
		include: buildIncludes(filters),
		order: buildOrder(filters),
		limit: filters.limit ?? 100,
		offset: filters.offset ?? 0
	};

	const { rows, count } = await Backlog.findAndCountAll(query);
	return { rows, total: count };
}

export async function findFriendsActivityForGame(
	followingIds: string[],
	mutualIds: string[],
	gameId: string
) {
	if (followingIds.length === 0) return [];

	const rows = await Backlog.findAll({
		where: { gameId, isPublic: true, userId: { [Op.in]: followingIds } },
		include: [
			{
				model: User,
				where: {
					isActive: true,
					[Op.or]: [
						{
							profileVisibility: "public",
							backlogVisibility: "public"
						},
						{
							id: { [Op.in]: mutualIds },
							profileVisibility: {
								[Op.in]: ["public", "friends"]
							},
							backlogVisibility: {
								[Op.in]: ["public", "friends"]
							}
						}
					]
				},
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [["createdAt", "DESC"]]
	});

	const seen = new Set<string>();
	return rows.filter(row => {
		if (seen.has(row.userId)) return false;
		seen.add(row.userId);
		return true;
	});
}

export async function findRandomPlayersForGame(
	gameId: string,
	viewerId: string,
	excludeUserIds: string[] = [],
	limit = 10
) {
	const excluded = [...new Set([viewerId, ...excludeUserIds])];

	const rows = await Backlog.findAll({
		where: { gameId, isPublic: true, userId: { [Op.notIn]: excluded } },
		include: [
			{
				model: User,
				where: {
					isActive: true,
					profileVisibility: "public",
					backlogVisibility: "public"
				},
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [["createdAt", "DESC"]]
	});

	const byUser = new Map<string, (typeof rows)[number]>();
	for (const row of rows) {
		if (!byUser.has(row.userId)) byUser.set(row.userId, row);
	}

	const unique = Array.from(byUser.values());
	for (let i = unique.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = unique[i]!;
		unique[i] = unique[j]!;
		unique[j] = tmp;
	}
	return unique.slice(0, limit);
}

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
				model: Game,
				attributes: ["id", "code", "title", "backgroundUrl"]
			}
		],
		order: [["createdAt", "DESC"]]
	});
}

export async function findHighlightsByUserId(
	userId: string,
	includePrivate: boolean,
	options: { recentLimit?: number; year?: number; month?: number } = {}
) {
	const { recentLimit = 6 } = options;
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
		include: backlogInclude,
		order: [["finishedAt", "DESC"]],
		limit: recentLimit
	});

	const monthEntries = await Backlog.findAll({
		where: {
			...baseWhere,
			finishedAt: { [Op.gte]: monthStart, [Op.lte]: monthEnd }
		},
		include: backlogInclude,
		order: [["finishedAt", "DESC"]]
	});

	let mostPlayed: Backlog | null = null;
	let highestRated: Backlog | null = null;
	for (const entry of monthEntries) {
		if (
			entry.realDuration !== null &&
			entry.realDuration !== undefined &&
			(mostPlayed === null ||
				(mostPlayed.realDuration ?? 0) < entry.realDuration)
		) {
			mostPlayed = entry;
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
			mostPlayed,
			highestRated
		}
	};
}

export async function findCompletionsByUserIdPaginated(
	userId: string,
	includePrivate: boolean,
	options: { limit?: number; offset?: number } = {}
) {
	const { limit = 20, offset = 0 } = options;
	const where: Record<string, unknown> = {
		userId,
		status: "completed",
		finishedAt: { [Op.ne]: null }
	};
	if (!includePrivate) where.isPublic = true;

	const { rows, count } = await Backlog.findAndCountAll({
		where,
		include: backlogInclude,
		order: [["finishedAt", "DESC"]],
		limit,
		offset,
		distinct: true
	});

	return { rows, total: count };
}

export async function findPublicBacklogByUserId(
	userId: string,
	filters: BacklogQuery = {}
) {
	const query: Record<string, unknown> = {
		where: buildBacklogWhere({ userId, isPublic: true }, filters),
		include: buildIncludes(filters),
		order: buildOrder(filters),
		limit: filters.limit ?? 100,
		offset: filters.offset ?? 0
	};

	const { rows, count } = await Backlog.findAndCountAll(query);
	return { rows, total: count };
}

export async function updateBacklog(
	id: string,
	userId: string,
	updateBacklog: UpdateBacklogDto
) {
	const backlogEntry = await findBacklogById(id);
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	if (
		updateBacklog.compilationGameId !== undefined &&
		updateBacklog.compilationGameId !== null
	) {
		await assertCompilationContext(
			backlogEntry.gameId,
			updateBacklog.compilationGameId
		);
	}

	await backlogEntry.update(updateBacklog);

	let queueRemoved = false;
	if (
		updateBacklog.status === "playing" ||
		updateBacklog.status === "completed" ||
		updateBacklog.status === "abandoned" ||
		updateBacklog.status === "endless"
	) {
		queueRemoved = await queueService.removeByBacklogId(id, userId);
	}

	return { backlog: backlogEntry, queueRemoved };
}

export async function findLatestCompletedDurations(
	pairs: { userId: string; gameId: string }[]
): Promise<Map<string, number>> {
	if (pairs.length === 0) return new Map();

	const userIds = Array.from(new Set(pairs.map(p => p.userId)));
	const gameIds = Array.from(new Set(pairs.map(p => p.gameId)));

	const rows = await sequelize.query<{
		userId: string;
		gameId: string;
		realDuration: number;
	}>(
		`SELECT DISTINCT ON ("userId", "gameId") "userId", "gameId", "realDuration"
		 FROM "Backlogs"
		 WHERE "userId" IN (:userIds)
		   AND "gameId" IN (:gameIds)
		   AND status = 'completed'
		   AND "realDuration" IS NOT NULL
		 ORDER BY "userId", "gameId", "createdAt" DESC`,
		{
			replacements: { userIds, gameIds },
			type: QueryTypes.SELECT
		}
	);

	const map = new Map<string, number>();
	for (const row of rows) {
		map.set(`${row.userId}:${row.gameId}`, row.realDuration);
	}
	return map;
}

export async function removeBacklog(id: string, userId: string) {
	const backlogEntry = await Backlog.findOne({
		where: { id },
		attributes: ["id", "userId"]
	});
	if (!backlogEntry) throw backlogServiceError.notFoundError();
	if (backlogEntry.userId !== userId)
		throw backlogServiceError.forbiddenError();

	await sequelize.transaction(async transaction => {
		await queueService.lockUserQueue(userId, transaction);
		await Backlog.destroy({ where: { id }, transaction });
		await queueService.compactPositions(userId, transaction);
	});
	return true;
}
