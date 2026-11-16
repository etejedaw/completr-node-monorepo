import { Op, QueryTypes, type Transaction } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import * as gameGenreService from "../game-genre/game-genre.service";
import * as gamePlatinumService from "../game-platinum/game-platinum.service";
import { type PremiumAccess } from "../premium-access/premium-access.interface";
import { resolvePremiumAccess } from "../premium-access/services/premium-access.service";
import * as rewindEditionsService from "../rewind-editions/services/rewind-editions.service";
import { resolveSectionAccess } from "../users/helpers/visibility.helper";
import * as usersService from "../users/services/users.service";
import { type User } from "../users/user.model";
import { type GenerateRewindDto } from "./dtos/generate-rewind.dto";
import * as rewindServiceError from "./errors/rewind.service-error";
import { rewindViewToRewind } from "./mappers/rewind-view-to-rewind.mapper";
import { userToRewindOwner } from "./mappers/user-to-rewind-owner.mapper";
import {
	type Rewind,
	type RewindSnapshot,
	type RewindView,
	type RewindYears
} from "./rewind.interface";
import { Rewind as RewindModel } from "./rewind.model";
import { type RewindGenerationResult } from "./rewind-generation.interface";
import {
	type RewindRecord,
	type RewindViewerContext,
	type RewindYearVisibility
} from "./rewind-record.interface";
import { type RewindEntryPoint } from "./rewind-record.types";
import { type RewindCalendar, type RewindRun } from "./rewind-run.interface";
import {
	runRecap,
	storePremiumStats
} from "./services/rewind-ai-recap.service";
import { freezeRewind } from "./services/rewind-freeze.service";
import {
	requireGenerationAllowed,
	reserveGeneration
} from "./services/rewind-reservation.service";
import { findRewindRuns } from "./services/rewind-runs.service";
import { buildRewind } from "./utils/build-rewind.util";
import { buildRewindOwnerControls } from "./utils/build-rewind-owner-controls.util";
import { buildRewindYears } from "./utils/build-rewind-years.util";
import { collectYearRuns } from "./utils/collect-year-runs.util";
import { listRewindYears } from "./utils/list-rewind-years.util";
import { listVisibleRewindYears } from "./utils/list-visible-rewind-years.util";
import { resolveClosedRewindEdition } from "./utils/resolve-closed-rewind-edition.util";
import { resolveCurrentRewindDay } from "./utils/resolve-current-rewind-day.util";
import { resolveRewindPremiumAccessKind } from "./utils/resolve-rewind-premium-access-kind.util";
import { resolveRewindViewerAccess } from "./utils/resolve-rewind-viewer-access.util";
import { resolveSpotlightYear } from "./utils/resolve-spotlight-year.util";
import { toRewindStoredView } from "./utils/to-rewind-stored-view.util";

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

function findRuns(owner: User, publicOnly: boolean) {
	return findRewindRuns(owner.id, { publicOnly, includeNotes: false });
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
	entryPoint: RewindEntryPoint,
	providedPremiumAccess?: PremiumAccess
): Promise<RewindViewerContext> {
	const access = resolveRewindViewerAccess(
		await resolveSectionAccess(viewerId, owner),
		entryPoint
	);
	if (!access.rewind) throw rewindServiceError.userPrivateError();

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
	const context = await buildViewerContext(viewerId, owner, "archive");
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
	const context = await buildViewerContext(viewerId, owner, "link");
	return buildRewindForContext(context, year);
}

async function getOwnRewind(
	owner: User,
	year: number,
	premiumAccess: PremiumAccess
): Promise<Rewind> {
	const context = await buildViewerContext(
		owner.id,
		owner,
		"link",
		premiumAccess
	);
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
		await runRecap({
			owner,
			record,
			calendar,
			reusablePremiumStats: null,
			premiumAccess,
			spend
		});
	else if (record.premiumAccessKind !== null)
		await storePremiumStats(owner, record);

	return {
		rewind: await getOwnRewind(owner, year, premiumAccess),
		created
	};
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

export async function shiftGeneratedRewindQuotas(
	year: number,
	premiumDelta: number,
	giftDelta: number,
	transaction: Transaction
): Promise<number> {
	if (premiumDelta === 0 && giftDelta === 0) return 0;
	const [, affectedRows] = await sequelize.query(
		`UPDATE "Rewinds"
		SET "regenerationsLeft" = GREATEST(
				0,
				"regenerationsLeft" + CASE "premiumAccessKind"
					WHEN 'premium' THEN :premiumDelta
					WHEN 'gift' THEN :giftDelta
				END
			),
			"updatedAt" = NOW()
		WHERE "year" = :year
			AND (
				("premiumAccessKind" = 'premium' AND :premiumDelta <> 0)
				OR ("premiumAccessKind" = 'gift' AND :giftDelta <> 0)
			)`,
		{
			replacements: { year, premiumDelta, giftDelta },
			type: QueryTypes.UPDATE,
			transaction
		}
	);
	return affectedRows;
}
