import { type Transaction } from "sequelize";

import * as backlogService from "../backlog/backlog.service";
import { environmentConfig } from "../common/config/environment.config";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { PinoLogger } from "../common/logger/pino.logger";
import { isPremiumRole } from "../common/utils/is-premium-role.util";
import { sequelize } from "../database/sequelize.database";
import * as gameGenreService from "../game-genre/game-genre.service";
import * as gamePlatinumService from "../game-platinum/game-platinum.service";
import { generateRewindAiRecap } from "../rewind-recap/rewind-recap.service";
import { buildRewindPremiumStats } from "../rewind-recap/utils/build-rewind-premium-stats.util";
import { resolveSectionAccess } from "../users/helpers/visibility.helper";
import { type User } from "../users/user.model";
import * as usersService from "../users/users.service";
import * as rewindServiceError from "./errors/rewind.service-error";
import { type GenerateRewindDto } from "./generate-rewind.dto";
import { backlogToRewindRun } from "./mappers/backlog-to-rewind-run.mapper";
import { userToRewindOwner } from "./mappers/user-to-rewind-owner.mapper";
import {
	type Rewind,
	type RewindAiRecap,
	type RewindPremiumStats,
	type RewindTotals,
	type RewindYears
} from "./rewind.interface";
import { Rewind as RewindModel } from "./rewind.model";
import {
	type RecapContent,
	type RecapRequest,
	type RecapSources,
	type RewindGenerationResult
} from "./rewind-generation.interface";
import {
	type RewindRecord,
	type RewindViewerContext,
	type RewindYearVisibility
} from "./rewind-record.interface";
import { type RewindStoredView } from "./rewind-record.types";
import {
	type RewindCalendar,
	type RewindGameGenre,
	type RewindRun
} from "./rewind-run.interface";
import { buildRewind } from "./utils/build-rewind.util";
import { buildRewindOwnerControls } from "./utils/build-rewind-owner-controls.util";
import { buildRewindYears } from "./utils/build-rewind-years.util";
import { collectYearRuns } from "./utils/collect-year-runs.util";
import { isAiRecapInProgress } from "./utils/is-ai-recap-in-progress.util";
import { listActiveGameIds } from "./utils/list-active-game-ids.util";
import { listRewindYears } from "./utils/list-rewind-years.util";
import { listVisibleRewindYears } from "./utils/list-visible-rewind-years.util";
import { nextGeneratedAt } from "./utils/next-generated-at.util";
import { planRewindGeneration } from "./utils/plan-rewind-generation.util";
import { resolveRewindToday } from "./utils/resolve-rewind-today.util";

const logger = new PinoLogger("Rewind Service");

function rewindTodayOverride(): string | undefined {
	return environmentConfig.NODE_ENV === "prod"
		? undefined
		: environmentConfig.REWIND_TODAY;
}

function buildRewindCalendar(owner: User): RewindCalendar {
	return {
		today: resolveRewindToday(rewindTodayOverride(), new Date()),
		firstYear: owner.createdAt.getUTCFullYear()
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
	const records = await RewindModel.findAll({ where: { userId } });
	return new Map(records.map(record => [record.year, record]));
}

async function findRuns(owner: User, publicOnly: boolean) {
	const runs = await backlogService.findDatedRunsByUserId(owner.id, {
		publicOnly
	});
	return runs.map(backlogToRewindRun);
}

async function buildViewerContext(
	viewerId: string | undefined,
	owner: User
): Promise<RewindViewerContext> {
	const access = await resolveSectionAccess(viewerId, owner);
	if (!access.profile || !access.rewind)
		throw rewindServiceError.userPrivateError();

	const isOwner = viewerId === owner.id;
	const [runs, records] = await Promise.all([
		findRuns(owner, !isOwner),
		findRecordsByUserId(owner.id)
	]);
	return {
		owner,
		access,
		isOwner,
		runs,
		calendar: buildRewindCalendar(owner),
		records
	};
}

function yearVisibility(context: RewindViewerContext): RewindYearVisibility {
	return {
		generatedYears: new Set(context.records.keys()),
		includeUngenerated: context.isOwner
	};
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

function storedView(
	record: RewindRecord,
	ownerControls: Rewind["ownerControls"]
): RewindStoredView {
	return {
		language: record.language,
		generatedAt: record.generatedAt.toISOString(),
		aiRecap: record.aiRecapStatus === "ready" ? record.aiRecap : null,
		premiumStats: record.premiumStats,
		ownerControls
	};
}

function ownerControlsFor(context: RewindViewerContext, record: RewindRecord) {
	if (!context.isOwner) return null;
	return buildRewindOwnerControls(
		record,
		context.calendar.today,
		isPremiumRole(context.owner.role)
	);
}

export async function getRewindYearsForViewer(
	viewerId: string | undefined,
	username: string
): Promise<RewindYears> {
	const owner = await requireRewindOwner(username);
	const context = await buildViewerContext(viewerId, owner);
	const visibility = yearVisibility(context);
	const years = listVisibleRewindYears(
		context.runs,
		context.calendar,
		visibility
	);
	const [genres, platinumCounts] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listFinishedGameIds(context.runs, years)
		),
		Promise.all(years.map(year => countVisiblePlatinums(context, year)))
	]);

	return buildRewindYears({
		runs: context.runs,
		genres,
		platinumsByYear: new Map(
			years.map((year, index) => [year, platinumCounts[index] ?? null])
		),
		calendar: context.calendar,
		visibility
	});
}

async function buildRewindForContext(
	context: RewindViewerContext,
	year: number
): Promise<Rewind> {
	const record = context.records.get(year);
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

	return buildRewind({
		year,
		owner: userToRewindOwner(context.owner),
		runs: context.runs,
		genres,
		platinums,
		calendar: context.calendar,
		visibility: yearVisibility(context),
		stored: storedView(record, ownerControlsFor(context, record))
	});
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

async function getOwnRewind(owner: User, year: number): Promise<Rewind> {
	const context = await buildViewerContext(owner.id, owner);
	return buildRewindForContext(context, year);
}

async function requireOpenYearWithData(owner: User, year: number) {
	const runs = await findRuns(owner, false);
	const calendar = buildRewindCalendar(owner);
	if (!listRewindYears(runs, calendar).includes(year))
		throw rewindServiceError.notFoundError();
	return calendar;
}

function lockRecord(userId: string, year: number, transaction: Transaction) {
	return RewindModel.findOne({
		where: { userId, year },
		lock: transaction.LOCK.UPDATE,
		transaction
	});
}

async function createRecord(
	owner: User,
	year: number,
	dto: GenerateRewindDto,
	transaction: Transaction
): Promise<RewindModel> {
	const now = new Date();
	const ownerIsPremium = isPremiumRole(owner.role);
	try {
		return await RewindModel.create(
			{
				userId: owner.id,
				year,
				language: dto.language,
				includesPrivateRuns: dto.includePrivateRuns,
				generatedAt: now,
				aiRecapStatus: ownerIsPremium ? "pending" : "none",
				aiRecapRequestedAt: ownerIsPremium ? now : null
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
	owner: User,
	record: RewindModel,
	dto: GenerateRewindDto,
	spendsGrace: boolean,
	transaction: Transaction
): Promise<RewindModel> {
	const now = nextGeneratedAt(record.generatedAt, new Date());
	const ownerIsPremium = isPremiumRole(owner.role);
	return record.update(
		{
			language: dto.language,
			includesPrivateRuns: dto.includePrivateRuns,
			generatedAt: now,
			...(spendsGrace
				? { graceUsed: true }
				: { regenerationsUsed: record.regenerationsUsed + 1 }),
			...(ownerIsPremium && {
				aiRecapStatus: "pending",
				aiRecapRequestedAt: now
			})
		},
		{ transaction }
	);
}

async function reserveGeneration(
	owner: User,
	year: number,
	dto: GenerateRewindDto,
	calendar: RewindCalendar
): Promise<{ record: RewindModel; created: boolean }> {
	return sequelize.transaction(async transaction => {
		const record = await lockRecord(owner.id, year, transaction);
		const plan = planRewindGeneration({
			record,
			expectedGeneratedAt: dto.expectedGeneratedAt,
			today: calendar.today
		});

		if (plan.kind === "conflict")
			throw rewindServiceError.generationConflictError();
		if (plan.kind === "limit-reached")
			throw rewindServiceError.regenerationLimitError();
		if (plan.kind === "create" || !record) {
			return {
				record: await createRecord(owner, year, dto, transaction),
				created: true
			};
		}
		return {
			record: await regenerateRecord(
				owner,
				record,
				dto,
				plan.spendsGrace,
				transaction
			),
			created: false
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
	return buildRewind({
		year: previousYear,
		owner: userToRewindOwner(owner),
		runs: sourceRuns,
		genres,
		platinums,
		calendar,
		visibility: { generatedYears: new Set(), includeUngenerated: true },
		stored: storedView(record, null)
	}).totals;
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
		findRuns(owner, publicOnly),
		backlogService.countRunsAddedByMonth(owner.id, year, { publicOnly })
	]);
	const [genres, platinums] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listActiveGameIds(runs, [year, year - 1])
		),
		publicPlatinumsFor(owner, record.includesPrivateRuns, year)
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
	return { runs, genres, yearGenres, platinums, premiumStats };
}

async function writeAiRecap(
	owner: User,
	record: RewindRecord,
	calendar: RewindCalendar,
	sources: RecapSources
): Promise<RewindAiRecap> {
	const { year } = record;
	const rewind = buildRewind({
		year,
		owner: userToRewindOwner(owner),
		runs: sources.runs,
		genres: sources.genres,
		platinums: sources.platinums,
		calendar,
		visibility: { generatedYears: new Set(), includeUngenerated: true },
		stored: {
			...storedView(record, null),
			premiumStats: sources.premiumStats
		}
	});
	return generateRewindAiRecap({
		year,
		language: record.language,
		rewind,
		runs: sources.runs,
		genres: sources.yearGenres,
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

async function runRecap(
	owner: User,
	record: RewindModel,
	calendar: RewindCalendar,
	reusablePremiumStats: RewindPremiumStats | null
): Promise<boolean> {
	const request: RecapRequest = {
		recordId: record.id,
		requestedAt: record.aiRecapRequestedAt ?? new Date()
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
		const aiRecap = await writeAiRecap(owner, record, calendar, sources);
		await finishRecap(request, { aiRecap, premiumStats }, true);
		return true;
	} catch (error) {
		logger.error("runRecap", "failed", {
			rewindId: record.id,
			year: record.year,
			code: errorCode(error)
		});
		await finishRecap(request, { aiRecap: null, premiumStats }, false);
		return false;
	}
}

export async function generateOwnRewind(
	ownerId: string,
	year: number,
	dto: GenerateRewindDto
): Promise<RewindGenerationResult> {
	const owner = await requireSignedInOwner(ownerId);
	const calendar = await requireOpenYearWithData(owner, year);
	const { record, created } = await reserveGeneration(
		owner,
		year,
		dto,
		calendar
	);

	if (record.aiRecapStatus === "pending" && isPremiumRole(owner.role))
		await runRecap(owner, record, calendar, null);

	return { rewind: await getOwnRewind(owner, year), created };
}

async function reserveAiRecap(owner: User, year: number): Promise<RewindModel> {
	return sequelize.transaction(async transaction => {
		const record = await lockRecord(owner.id, year, transaction);
		const now = new Date();
		if (!record) throw rewindServiceError.notGeneratedError();
		if (!isPremiumRole(owner.role))
			throw rewindServiceError.aiRecapPremiumRequiredError();
		if (record.aiRecapStatus === "ready" && record.aiRecap)
			throw rewindServiceError.aiRecapExistsError();
		if (isAiRecapInProgress(record, now))
			throw rewindServiceError.aiRecapInProgressError();

		return record.update(
			{ aiRecapStatus: "pending", aiRecapRequestedAt: now },
			{ transaction }
		);
	});
}

export async function addOwnRewindAiRecap(
	ownerId: string,
	year: number
): Promise<Rewind> {
	const owner = await requireSignedInOwner(ownerId);
	const calendar = buildRewindCalendar(owner);
	const record = await reserveAiRecap(owner, year);

	const succeeded = await runRecap(
		owner,
		record,
		calendar,
		record.premiumStats
	);
	if (!succeeded) throw rewindServiceError.aiRecapFailedError();

	return getOwnRewind(owner, year);
}
