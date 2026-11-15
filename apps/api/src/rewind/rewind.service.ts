import { Op, type Transaction } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { ServiceError } from "../common/errors/service-error";
import { PinoLogger } from "../common/logger/pino.logger";
import * as coopRunsService from "../coop-runs/coop-runs.service";
import { sequelize } from "../database/sequelize.database";
import * as franchisesService from "../franchises/franchises.service";
import * as gameGenreService from "../game-genre/game-genre.service";
import * as gamePlatinumService from "../game-platinum/game-platinum.service";
import { type PremiumAccess } from "../premium-access/premium-access.interface";
import { resolvePremiumAccess } from "../premium-access/premium-access.service";
import * as reviewsService from "../reviews/reviews.service";
import * as rewindEditionsService from "../rewind-editions/rewind-editions.service";
import {
	type RewindCoopPartner,
	type RewindGameReview
} from "../rewind-recap/rewind-recap.interface";
import { generateRewindAiRecap } from "../rewind-recap/rewind-recap.service";
import { buildRewindPremiumStats } from "../rewind-recap/utils/build-rewind-premium-stats.util";
import { resolveSectionAccess } from "../users/helpers/visibility.helper";
import { type User } from "../users/user.model";
import * as usersService from "../users/users.service";
import { type GenerateRewindDto } from "./dtos/generate-rewind.dto";
import * as rewindServiceError from "./errors/rewind.service-error";
import { rewindViewToRewind } from "./mappers/rewind-view-to-rewind.mapper";
import { userToRewindOwner } from "./mappers/user-to-rewind-owner.mapper";
import { type RewindPremiumAccessKind } from "./rewind.constants";
import {
	type Rewind,
	type RewindAiRecap,
	type RewindPremiumStats,
	type RewindSnapshot,
	type RewindTotals,
	type RewindView,
	type RewindYears
} from "./rewind.interface";
import { Rewind as RewindModel } from "./rewind.model";
import {
	type RecapContent,
	type RecapRequest,
	type RecapSources,
	type RewindAiBudget,
	type RewindAiRecapReservation,
	type RewindGenerationReservation,
	type RewindGenerationResult
} from "./rewind-generation.interface";
import {
	type RewindAiSpend,
	type SpendableRewindAiBudget
} from "./rewind-generation.types";
import {
	type RewindRecord,
	type RewindViewerContext,
	type RewindYearVisibility
} from "./rewind-record.interface";
import {
	type RewindCalendar,
	type RewindGameGenre,
	type RewindRun
} from "./rewind-run.interface";
import { freezeRewind } from "./services/rewind-freeze.service";
import { findRewindRuns } from "./services/rewind-runs.service";
import { buildRewind } from "./utils/build-rewind.util";
import { buildRewindOwnerControls } from "./utils/build-rewind-owner-controls.util";
import { buildRewindYears } from "./utils/build-rewind-years.util";
import { buildYearTotals } from "./utils/build-year-totals.util";
import { collectYearRuns } from "./utils/collect-year-runs.util";
import { isAiRecapInProgress } from "./utils/is-ai-recap-in-progress.util";
import { listActiveGameIds } from "./utils/list-active-game-ids.util";
import { listRewindYears } from "./utils/list-rewind-years.util";
import { listVisibleRewindYears } from "./utils/list-visible-rewind-years.util";
import { nextGeneratedAt } from "./utils/next-generated-at.util";
import { planRewindGeneration } from "./utils/plan-rewind-generation.util";
import { resolveClosedRewindEdition } from "./utils/resolve-closed-rewind-edition.util";
import { resolveCurrentRewindDay } from "./utils/resolve-current-rewind-day.util";
import { resolveRewindAiBudget } from "./utils/resolve-rewind-ai-budget.util";
import { resolveRewindAiUseChanges } from "./utils/resolve-rewind-ai-use-changes.util";
import { resolveRewindGenerationBlocker } from "./utils/resolve-rewind-generation-blocker.util";
import { resolveRewindPremiumAccessKind } from "./utils/resolve-rewind-premium-access-kind.util";
import { resolveSpotlightYear } from "./utils/resolve-spotlight-year.util";
import { toRewindStoredView } from "./utils/to-rewind-stored-view.util";

const logger = new PinoLogger("Rewind Service");

const UNFROZEN_FIELDS = { snapshot: null, frozenAt: null };

async function buildRewindCalendar(owner: User): Promise<RewindCalendar> {
	const today = resolveCurrentRewindDay();
	const [edition, upcomingEdition] = await Promise.all([
		rewindEditionsService.findLatestOpenedRewindEdition(today),
		rewindEditionsService.findNextRewindEdition(today)
	]);
	return {
		today,
		firstYear: owner.createdAt.getUTCFullYear(),
		edition,
		upcomingEdition
	};
}

async function requireRewindOwner(username: string): Promise<User> {
	const owner = await usersService.findUserByUsername(username);
	if (!owner) throw rewindServiceError.userNotFoundError();
	return owner;
}

async function requireSignedInOwner(userId: string): Promise<User> {
	const owner = await usersService.findUserById(userId);
	if (!owner) throw rewindServiceError.userNotFoundError();
	return owner;
}

async function findRecordsByUserId(
	userId: string
): Promise<Map<number, RewindModel>> {
	const records = await RewindModel.findAll({
		attributes: { exclude: ["snapshot"] },
		where: { userId }
	});
	return new Map(records.map(record => [record.year, record]));
}

function findRuns(owner: User, publicOnly: boolean, includeNotes = false) {
	return findRewindRuns(owner.id, { publicOnly, includeNotes });
}

async function findFrozenSnapshots(
	userId: string
): Promise<Map<number, RewindSnapshot>> {
	const records = await RewindModel.findAll({
		attributes: ["year", "snapshot"],
		where: { userId, frozenAt: { [Op.ne]: null } }
	});
	return new Map(
		records.flatMap(record =>
			record.snapshot ? [[record.year, record.snapshot] as const] : []
		)
	);
}

function viewsFor(
	snapshots: Map<number, RewindSnapshot>,
	isOwner: boolean
): Map<number, RewindView | null> {
	return new Map(
		[...snapshots].map(([year, snapshot]) => [
			year,
			isOwner ? snapshot.owner : snapshot.public
		])
	);
}

async function freezeClosedRecordsOnRead(
	records: Map<number, RewindModel>,
	calendar: RewindCalendar
): Promise<boolean> {
	const closedEdition = resolveClosedRewindEdition(calendar);
	const liveRecords = [...records.values()].filter(
		record => !record.frozenAt
	);
	if (!closedEdition) return false;
	let changed = false;
	for (const record of liveRecords) {
		const outcome = await freezeRewind(record.id, closedEdition);
		changed ||= outcome.kind !== "pending";
	}
	return changed;
}

async function loadRecords(owner: User, calendar: RewindCalendar) {
	const records = await findRecordsByUserId(owner.id);
	const changed = await freezeClosedRecordsOnRead(records, calendar);
	const [currentRecords, snapshots] = await Promise.all([
		changed ? findRecordsByUserId(owner.id) : records,
		findFrozenSnapshots(owner.id)
	]);
	return { records: currentRecords, snapshots };
}

async function buildViewerContext(
	viewerId: string | undefined,
	owner: User,
	providedPremiumAccess?: PremiumAccess
): Promise<RewindViewerContext> {
	const access = await resolveSectionAccess(viewerId, owner);
	if (!access.profile || !access.rewind)
		throw rewindServiceError.userPrivateError();

	const isOwner = viewerId === owner.id;
	const calendar = await buildRewindCalendar(owner);
	const [premiumAccess, runs, { records, snapshots }] = await Promise.all([
		isOwner
			? (providedPremiumAccess ??
				resolvePremiumAccess(owner, "rewind.premium"))
			: null,
		findRuns(owner, !isOwner),
		loadRecords(owner, calendar)
	]);
	return {
		owner,
		access,
		premiumAccess,
		isOwner,
		runs,
		calendar,
		records,
		frozenViews: viewsFor(snapshots, isOwner)
	};
}

function yearVisibility(context: RewindViewerContext): RewindYearVisibility {
	return {
		generatedYears: new Set(context.records.keys()),
		includeUngenerated: context.isOwner,
		frozenYearListing: new Map(
			[...context.frozenViews].map(([year, view]) => [
				year,
				view !== null
			])
		)
	};
}

function listedFrozenViews(
	context: RewindViewerContext
): Map<number, RewindView> {
	return new Map(
		[...context.frozenViews].flatMap(([year, view]) =>
			view ? [[year, view] as const] : []
		)
	);
}

function countVisiblePlatinums(
	context: RewindViewerContext,
	year: number
): Promise<number | null> {
	if (!context.access.platinum) return Promise.resolve(null);
	return gamePlatinumService.countPlatinumsByUserIdAndYear(
		context.owner.id,
		year
	);
}

function listFinishedGameIds(runs: RewindRun[], years: number[]): string[] {
	const gameIds = years.flatMap(year =>
		collectYearRuns(runs, year).finished.map(run => run.gameId)
	);
	return [...new Set(gameIds)];
}

function ownerControlsFor(context: RewindViewerContext, record: RewindRecord) {
	if (!context.isOwner) return null;
	return buildRewindOwnerControls(
		record,
		context.calendar,
		context.premiumAccess
			? resolveRewindPremiumAccessKind(context.premiumAccess)
			: null
	);
}

export async function getRewindYearsForViewer(
	viewerId: string | undefined,
	username: string
): Promise<RewindYears> {
	const owner = await requireRewindOwner(username);
	const context = await buildViewerContext(viewerId, owner);
	const visibility = yearVisibility(context);
	const liveYears = listVisibleRewindYears(
		context.runs,
		context.calendar,
		visibility
	).filter(year => !context.frozenViews.has(year));
	const [genres, platinumCounts] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listFinishedGameIds(context.runs, liveYears)
		),
		Promise.all(liveYears.map(year => countVisiblePlatinums(context, year)))
	]);

	return {
		...buildRewindYears({
			runs: context.runs,
			genres,
			platinumsByYear: new Map(
				liveYears.map((year, index) => [
					year,
					platinumCounts[index] ?? null
				])
			),
			calendar: context.calendar,
			visibility,
			generationAccess: context.isOwner
				? {
						accessKind: context.premiumAccess
							? resolveRewindPremiumAccessKind(
									context.premiumAccess
								)
							: null
					}
				: null,
			frozenViews: listedFrozenViews(context),
			platinumsVisible: context.access.platinum
		}),
		premiumAccess: context.premiumAccess
	};
}

function buildFrozenRewind(
	context: RewindViewerContext,
	record: RewindRecord
): Rewind {
	const view = context.frozenViews.get(record.year);
	if (!view) throw rewindServiceError.notFoundError();
	return rewindViewToRewind(view, {
		user: userToRewindOwner(context.owner),
		isSpotlight: resolveSpotlightYear(context.calendar) === record.year,
		otherYears: listVisibleRewindYears(
			context.runs,
			context.calendar,
			yearVisibility(context)
		).filter(other => other !== record.year),
		ownerControls: ownerControlsFor(context, record),
		premiumAccess: context.premiumAccess,
		platinumsVisible: context.access.platinum
	});
}

async function buildRewindForContext(
	context: RewindViewerContext,
	year: number
): Promise<Rewind> {
	const record = context.records.get(year);
	if (record?.frozenAt) return buildFrozenRewind(context, record);

	const isListed = listRewindYears(context.runs, context.calendar).includes(
		year
	);
	if (!isListed) throw rewindServiceError.notFoundError();
	if (!record) {
		throw context.isOwner
			? rewindServiceError.notGeneratedError()
			: rewindServiceError.notFoundError();
	}

	const [genres, platinums] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listFinishedGameIds(context.runs, [year])
		),
		countVisiblePlatinums(context, year)
	]);

	return {
		...buildRewind({
			year,
			owner: userToRewindOwner(context.owner),
			runs: context.runs,
			genres,
			platinums,
			calendar: context.calendar,
			visibility: yearVisibility(context),
			stored: toRewindStoredView(
				record,
				ownerControlsFor(context, record)
			)
		}),
		premiumAccess: context.premiumAccess
	};
}

export async function getRewindForViewer(
	viewerId: string | undefined,
	username: string,
	year: number
): Promise<Rewind> {
	const owner = await requireRewindOwner(username);
	const context = await buildViewerContext(viewerId, owner);
	return buildRewindForContext(context, year);
}

async function getOwnRewind(
	owner: User,
	year: number,
	premiumAccess: PremiumAccess
): Promise<Rewind> {
	const context = await buildViewerContext(owner.id, owner, premiumAccess);
	return buildRewindForContext(context, year);
}

async function requireYearWithData(
	owner: User,
	year: number,
	calendar: RewindCalendar
): Promise<void> {
	const runs = await findRuns(owner, false);
	if (!listRewindYears(runs, calendar).includes(year))
		throw rewindServiceError.notFoundError();
}

function requireGenerationAllowed(
	year: number,
	calendar: RewindCalendar,
	accessKind: RewindPremiumAccessKind | null
): void {
	const blocker = resolveRewindGenerationBlocker(year, calendar, accessKind);
	if (blocker === "period-closed")
		throw rewindServiceError.periodClosedError();
	if (blocker === "requires-premium")
		throw rewindServiceError.yearRequiresPremiumError();
}

function lockRecord(userId: string, year: number, transaction: Transaction) {
	return RewindModel.findOne({
		where: { userId, year },
		lock: transaction.LOCK.UPDATE,
		transaction
	});
}

function pendingRecapFields(budget: RewindAiBudget, now: Date) {
	return budget.spend
		? { aiRecapStatus: "pending" as const, aiRecapRequestedAt: now }
		: {};
}

async function createRecord(
	owner: User,
	year: number,
	dto: GenerateRewindDto,
	budget: RewindAiBudget,
	transaction: Transaction
): Promise<RewindModel> {
	const now = new Date();
	try {
		return await RewindModel.create(
			{
				userId: owner.id,
				year,
				language: dto.language,
				includesPrivateRuns: dto.includePrivateRuns,
				includesNotes: dto.includeNotes,
				generatedAt: now,
				...resolveRewindAiUseChanges(
					{ graceUsed: false, premiumAccessKind: null },
					budget
				),
				...pendingRecapFields(budget, now)
			},
			{ transaction }
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: rewindServiceError.generationConflictError
		});
	}
}

async function regenerateRecord(
	record: RewindModel,
	dto: GenerateRewindDto,
	budget: RewindAiBudget,
	transaction: Transaction
): Promise<RewindModel> {
	const now = nextGeneratedAt(record.generatedAt, new Date());
	return record.update(
		{
			language: dto.language,
			includesPrivateRuns: dto.includePrivateRuns,
			includesNotes: dto.includeNotes,
			generatedAt: now,
			...UNFROZEN_FIELDS,
			...resolveRewindAiUseChanges(record, budget),
			...pendingRecapFields(budget, now)
		},
		{ transaction }
	);
}

async function reserveGeneration(
	owner: User,
	year: number,
	dto: GenerateRewindDto,
	calendar: RewindCalendar,
	accessKind: RewindPremiumAccessKind | null
): Promise<RewindGenerationReservation> {
	return sequelize.transaction(async transaction => {
		const record = await lockRecord(owner.id, year, transaction);
		const plan = planRewindGeneration({
			year,
			record,
			expectedGeneratedAt: dto.expectedGeneratedAt,
			calendar,
			accessKind
		});

		if (plan.kind === "conflict")
			throw rewindServiceError.generationConflictError();
		if (plan.kind === "premium-required")
			throw rewindServiceError.aiRecapPremiumRequiredError();
		if (plan.kind === "limit-reached")
			throw rewindServiceError.regenerationLimitError();
		if (plan.kind === "create" || !record) {
			return {
				record: await createRecord(
					owner,
					year,
					dto,
					plan.budget,
					transaction
				),
				created: true,
				spend: plan.budget.spend
			};
		}
		return {
			record: await regenerateRecord(
				record,
				dto,
				plan.budget,
				transaction
			),
			created: false,
			spend: plan.budget.spend
		};
	});
}

function isValidRewindYear(
	runs: RewindRun[],
	calendar: RewindCalendar,
	year: number
): boolean {
	return listRewindYears(runs, calendar).includes(year);
}

function publicPlatinumsFor(
	owner: User,
	includesPrivateRuns: boolean,
	year: number
): Promise<number | null> {
	const platinumIsPublic = owner.platinumVisibility === "public";
	if (!includesPrivateRuns && !platinumIsPublic) return Promise.resolve(null);
	return gamePlatinumService.countPlatinumsByUserIdAndYear(owner.id, year);
}

async function buildPreviousYearTotals(
	owner: User,
	record: RewindRecord,
	sourceRuns: RewindRun[],
	genres: RewindGameGenre[],
	calendar: RewindCalendar
): Promise<RewindTotals | null> {
	const previousYear = record.year - 1;
	if (!isValidRewindYear(sourceRuns, calendar, previousYear)) return null;

	const platinums = await publicPlatinumsFor(
		owner,
		record.includesPrivateRuns,
		previousYear
	);
	return buildYearTotals(sourceRuns, previousYear, genres, platinums);
}

async function findCoopPartners(
	runs: RewindRun[]
): Promise<RewindCoopPartner[]> {
	const membersByRun = await coopRunsService.findMembersForManyBacklogs(
		runs.map(run => run.id)
	);
	return [...membersByRun.entries()].flatMap(([runId, members]) =>
		members.map(member => ({ runId, partnerId: member.userId }))
	);
}

async function findWrittenReviews(
	owner: User,
	runs: RewindRun[]
): Promise<RewindGameReview[]> {
	const gameIds = [...new Set(runs.map(run => run.gameId))];
	if (gameIds.length === 0) return [];
	const reviewsByGame =
		await reviewsService.findReviewContentByUserAndGameIds(
			owner.id,
			gameIds
		);
	return [...reviewsByGame.entries()].flatMap(([gameId, review]) =>
		review.content?.trim() ? [{ gameId, content: review.content }] : []
	);
}

async function gatherRecapSources(
	owner: User,
	record: RewindRecord,
	calendar: RewindCalendar,
	reusablePremiumStats: RewindPremiumStats | null
): Promise<RecapSources> {
	const publicOnly = !record.includesPrivateRuns;
	const { year } = record;
	const [runs, addedByMonth] = await Promise.all([
		findRuns(owner, publicOnly, record.includesNotes),
		backlogService.countRunsAddedByMonth(owner.id, year, { publicOnly })
	]);
	const [genres, franchises, platinums, coopPartners, reviews] =
		await Promise.all([
			gameGenreService.findGenresByGameIds(
				listActiveGameIds(runs, [year, year - 1])
			),
			franchisesService.findFranchisesByGameIds(
				listActiveGameIds(runs, [year])
			),
			publicPlatinumsFor(owner, record.includesPrivateRuns, year),
			findCoopPartners(runs),
			findWrittenReviews(owner, runs)
		]);
	const yearGenres = filterGenresOfYear(genres, runs, year);
	const premiumStats =
		reusablePremiumStats ??
		buildRewindPremiumStats({
			year,
			runs,
			genres: yearGenres,
			addedByMonth
		});
	return {
		runs,
		genres,
		yearGenres,
		franchises,
		coopPartners,
		reviews,
		platinums,
		premiumStats
	};
}

async function writeAiRecap(
	owner: User,
	record: RewindRecord,
	calendar: RewindCalendar,
	sources: RecapSources,
	premiumAccess: PremiumAccess
): Promise<RewindAiRecap> {
	const { year } = record;
	const rewind = {
		...buildRewind({
			year,
			owner: userToRewindOwner(owner),
			runs: sources.runs,
			genres: sources.genres,
			platinums: sources.platinums,
			calendar,
			visibility: {
				generatedYears: new Set(),
				includeUngenerated: true,
				frozenYearListing: new Map()
			},
			stored: {
				...toRewindStoredView(record, null),
				premiumStats: sources.premiumStats
			}
		}),
		premiumAccess
	};
	return generateRewindAiRecap({
		year,
		language: record.language,
		includesNotes: record.includesNotes,
		rewind,
		runs: sources.runs,
		genres: sources.yearGenres,
		franchises: sources.franchises,
		coopPartners: sources.coopPartners,
		reviews: sources.reviews,
		previousYearTotals: await buildPreviousYearTotals(
			owner,
			record,
			sources.runs,
			sources.genres,
			calendar
		)
	});
}

function filterGenresOfYear(
	genres: RewindGameGenre[],
	runs: RewindRun[],
	year: number
): RewindGameGenre[] {
	const activeGameIds = new Set(listActiveGameIds(runs, [year]));
	return genres.filter(genre => activeGameIds.has(genre.gameId));
}

function errorCode(error: unknown): string {
	if (error instanceof Error && "code" in error)
		return String((error as { code: unknown }).code);
	return error instanceof Error ? error.name : "UNKNOWN";
}

function errorFailures(error: unknown): unknown {
	if (!(error instanceof ServiceError)) return undefined;
	const raw = error.serviceError.raw;
	if (typeof raw !== "object" || raw === null || !("failures" in raw))
		return undefined;
	return raw.failures;
}

async function finishRecap(
	request: RecapRequest,
	content: RecapContent,
	succeeded: boolean
): Promise<void> {
	await RewindModel.update(
		{
			aiRecapStatus: succeeded ? "ready" : "failed",
			...(content.aiRecap && { aiRecap: content.aiRecap }),
			...(content.premiumStats && { premiumStats: content.premiumStats })
		},
		{
			where: {
				id: request.recordId,
				aiRecapStatus: "pending",
				aiRecapRequestedAt: request.requestedAt
			}
		}
	);
}

async function refundAiSpend(request: RecapRequest): Promise<void> {
	const where = { id: request.recordId };
	if (request.spend === "grace") {
		await RewindModel.update({ graceUsed: false }, { where });
		return;
	}
	await RewindModel.increment("regenerationsLeft", { by: 1, where });
}

async function runRecap(
	owner: User,
	record: RewindModel,
	calendar: RewindCalendar,
	reusablePremiumStats: RewindPremiumStats | null,
	premiumAccess: PremiumAccess,
	spend: RewindAiSpend
): Promise<boolean> {
	const request: RecapRequest = {
		recordId: record.id,
		requestedAt: record.aiRecapRequestedAt ?? new Date(),
		spend
	};
	let premiumStats: RewindPremiumStats | null = null;
	try {
		const sources = await gatherRecapSources(
			owner,
			record,
			calendar,
			reusablePremiumStats
		);
		premiumStats = sources.premiumStats;
		const aiRecap = await writeAiRecap(
			owner,
			record,
			calendar,
			sources,
			premiumAccess
		);
		await finishRecap(request, { aiRecap, premiumStats }, true);
		return true;
	} catch (error) {
		logger.error("runRecap", "failed", {
			rewindId: record.id,
			year: record.year,
			code: errorCode(error),
			failures: errorFailures(error)
		});
		await finishRecap(request, { aiRecap: null, premiumStats }, false);
		await refundAiSpend(request);
		return false;
	}
}

async function resolveOwnerAccess(owner: User) {
	const [calendar, premiumAccess] = await Promise.all([
		buildRewindCalendar(owner),
		resolvePremiumAccess(owner, "rewind.premium")
	]);
	return {
		calendar,
		premiumAccess,
		accessKind: resolveRewindPremiumAccessKind(premiumAccess)
	};
}

export async function generateOwnRewind(
	ownerId: string,
	year: number,
	dto: GenerateRewindDto
): Promise<RewindGenerationResult> {
	const owner = await requireSignedInOwner(ownerId);
	const { calendar, premiumAccess, accessKind } =
		await resolveOwnerAccess(owner);
	await requireYearWithData(owner, year, calendar);
	requireGenerationAllowed(year, calendar, accessKind);

	const { record, created, spend } = await reserveGeneration(
		owner,
		year,
		dto,
		calendar,
		accessKind
	);
	if (spend)
		await runRecap(owner, record, calendar, null, premiumAccess, spend);

	return {
		rewind: await getOwnRewind(owner, year, premiumAccess),
		created
	};
}

function requireAiRecapAllowed(
	record: RewindModel,
	calendar: RewindCalendar,
	accessKind: RewindPremiumAccessKind | null,
	now: Date
): SpendableRewindAiBudget {
	requireGenerationAllowed(record.year, calendar, accessKind);
	if (accessKind === null)
		throw rewindServiceError.aiRecapPremiumRequiredError();
	if (record.aiRecapStatus === "ready" && record.aiRecap)
		throw rewindServiceError.aiRecapExistsError();
	if (isAiRecapInProgress(record, now))
		throw rewindServiceError.aiRecapInProgressError();

	const budget = resolveRewindAiBudget(record, calendar, accessKind);
	const { spend } = budget;
	if (!spend) throw rewindServiceError.regenerationLimitError();
	return { ...budget, spend };
}

async function reserveAiRecap(
	owner: User,
	year: number,
	calendar: RewindCalendar,
	accessKind: RewindPremiumAccessKind | null
): Promise<RewindAiRecapReservation> {
	return sequelize.transaction(async transaction => {
		const record = await lockRecord(owner.id, year, transaction);
		if (!record) throw rewindServiceError.notGeneratedError();
		const now = new Date();
		const budget = requireAiRecapAllowed(record, calendar, accessKind, now);

		return {
			record: await record.update(
				{
					aiRecapStatus: "pending",
					aiRecapRequestedAt: now,
					...UNFROZEN_FIELDS,
					...resolveRewindAiUseChanges(record, budget)
				},
				{ transaction }
			),
			spend: budget.spend
		};
	});
}

export async function addOwnRewindAiRecap(
	ownerId: string,
	year: number
): Promise<Rewind> {
	const owner = await requireSignedInOwner(ownerId);
	const { calendar, premiumAccess, accessKind } =
		await resolveOwnerAccess(owner);
	const { record, spend } = await reserveAiRecap(
		owner,
		year,
		calendar,
		accessKind
	);

	const succeeded = await runRecap(
		owner,
		record,
		calendar,
		record.premiumStats,
		premiumAccess,
		spend
	);
	if (!succeeded) throw rewindServiceError.aiRecapFailedError();

	return getOwnRewind(owner, year, premiumAccess);
}

export async function findRewindsForDataExport(userId: string) {
	return RewindModel.findAll({
		where: { userId },
		order: [
			["year", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function countRewindsByYear(
	years: number[]
): Promise<Map<number, number>> {
	if (years.length === 0) return new Map();
	const counts = (await RewindModel.count({
		where: { year: { [Op.in]: years } },
		group: ["year"]
	})) as unknown as { year: number; count: number }[];
	return new Map(counts.map(row => [row.year, row.count]));
}

export function countRewindsOfYear(
	year: number,
	transaction?: Transaction
): Promise<number> {
	return RewindModel.count({ where: { year }, transaction });
}
