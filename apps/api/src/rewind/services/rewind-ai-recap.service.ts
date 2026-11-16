import * as backlogRewindService from "../../backlog/services/backlog-rewind.service";
import { PinoLogger } from "../../common/logger/pino.logger";
import * as coopRunsService from "../../coop-runs/coop-runs.service";
import * as franchisesService from "../../franchises/franchises.service";
import * as gameGenreService from "../../game-genre/game-genre.service";
import * as gamePlatinumService from "../../game-platinum/game-platinum.service";
import * as moodTagsService from "../../mood-tags/mood-tags.service";
import { type PremiumAccess } from "../../premium-access/premium-access.interface";
import * as queueService from "../../queue/queue.service";
import * as reviewsService from "../../reviews/reviews.service";
import { REWIND_RECAP_UP_NEXT_LIMIT } from "../../rewind-recap/rewind-recap.constants";
import {
	type RewindCoopPartner,
	type RewindGameReview,
	type RewindGameTag,
	type RewindQueuedGame,
	type RewindRunPlatinum
} from "../../rewind-recap/rewind-recap.interface";
import { generateRewindAiRecap } from "../../rewind-recap/rewind-recap.service";
import { buildRewindPremiumStats } from "../../rewind-recap/utils/build-rewind-premium-stats.util";
import { groupGenreNamesByGame } from "../../rewind-recap/utils/group-genre-names-by-game.util";
import { type User } from "../../users/user.model";
import { platinumToRewindRunPlatinum } from "../mappers/platinum-to-rewind-run-platinum.mapper";
import { queueEntryToRewindQueuedGame } from "../mappers/queue-entry-to-rewind-queued-game.mapper";
import { userToRewindOwner } from "../mappers/user-to-rewind-owner.mapper";
import { REWIND_AI_TOKEN_SPENDING_ERROR_CODES } from "../rewind.constants";
import {
	type RewindAiRecap,
	type RewindPremiumStats,
	type RewindTotals
} from "../rewind.interface";
import { Rewind as RewindModel } from "../rewind.model";
import {
	type RecapRequest,
	type RecapRunInput,
	type RecapSources
} from "../rewind-generation.interface";
import { type RewindAiSpend } from "../rewind-generation.types";
import { type RewindRecord } from "../rewind-record.interface";
import {
	type RewindCalendar,
	type RewindGameGenre,
	type RewindRun
} from "../rewind-run.interface";
import { buildRewind } from "../utils/build-rewind.util";
import { buildYearTotals } from "../utils/build-year-totals.util";
import { findServiceErrorFailures } from "../utils/find-service-error-failures.util";
import { isSectionShared } from "../utils/is-section-shared.util";
import { listActiveGameIds } from "../utils/list-active-game-ids.util";
import { listRewindYears } from "../utils/list-rewind-years.util";
import { resolveErrorCode } from "../utils/resolve-error-code.util";
import { toRewindStoredView } from "../utils/to-rewind-stored-view.util";
import { findRewindRuns } from "./rewind-runs.service";

const logger = new PinoLogger("Rewind AI Recap Service");

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

async function findUpNext(
	owner: User,
	record: RewindRecord
): Promise<RewindQueuedGame[]> {
	if (!isSectionShared(owner.queueVisibility, record.includesPrivateRuns))
		return [];
	const { rows } = await queueService.findQueueByUserIdPaginated(
		owner.id,
		{ limit: REWIND_RECAP_UP_NEXT_LIMIT },
		!record.includesPrivateRuns
	);
	const genres = await gameGenreService.findGenresByGameIds(
		rows.map(entry => entry.Backlog.gameId)
	);
	const genreNamesByGame = groupGenreNamesByGame(genres);
	return rows.map(entry =>
		queueEntryToRewindQueuedGame(entry, genreNamesByGame)
	);
}

async function findGameTags(
	owner: User,
	gameIds: string[]
): Promise<RewindGameTag[]> {
	const tagsByGame = await moodTagsService.findTagsForGames(owner.id, [
		...new Set(gameIds)
	]);
	return [...tagsByGame.entries()].flatMap(([gameId, tags]) =>
		tags.map(tag => ({ gameId, tag }))
	);
}

async function findRunPlatinums(
	owner: User,
	record: RewindRecord,
	runs: RewindRun[]
): Promise<RewindRunPlatinum[] | null> {
	if (!isSectionShared(owner.platinumVisibility, record.includesPrivateRuns))
		return null;
	const platinums = await gamePlatinumService.findPlatinumsByBacklogIds(
		owner.id,
		runs.map(run => run.id),
		{ includeNotes: record.includesNotes }
	);
	return platinums.flatMap(platinum =>
		platinum.backlogId === null
			? []
			: [platinumToRewindRunPlatinum(platinum, platinum.backlogId)]
	);
}

async function gatherRecapSources(
	owner: User,
	record: RewindRecord,
	reusablePremiumStats: RewindPremiumStats | null
): Promise<RecapSources> {
	const publicOnly = !record.includesPrivateRuns;
	const { year } = record;
	const [runs, addedByMonth, upNext] = await Promise.all([
		findRewindRuns(owner.id, {
			publicOnly,
			includeNotes: record.includesNotes
		}),
		backlogRewindService.countRunsAddedByMonth(owner.id, year, {
			publicOnly
		}),
		findUpNext(owner, record)
	]);
	const yearGameIds = listActiveGameIds(runs, [year]);
	const [
		genres,
		franchises,
		platinums,
		coopPartners,
		reviews,
		tags,
		runPlatinums
	] = await Promise.all([
		gameGenreService.findGenresByGameIds(
			listActiveGameIds(runs, [year, year - 1])
		),
		franchisesService.findFranchisesByGameIds(yearGameIds),
		publicPlatinumsFor(owner, record.includesPrivateRuns, year),
		findCoopPartners(runs),
		findWrittenReviews(owner, runs),
		findGameTags(owner, [
			...yearGameIds,
			...upNext.map(game => game.gameId)
		]),
		findRunPlatinums(owner, record, runs)
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
		tags,
		runPlatinums,
		upNext,
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
		tags: sources.tags,
		platinums: sources.runPlatinums,
		upNext: sources.upNext,
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

function updatePendingRecap(
	request: RecapRequest,
	fields: Partial<RewindModel>
): Promise<unknown> {
	return RewindModel.update(fields, {
		where: {
			id: request.recordId,
			aiRecapStatus: "pending",
			aiRecapRequestedAt: request.requestedAt
		}
	});
}

function markRecapReady(
	request: RecapRequest,
	aiRecap: RewindAiRecap,
	premiumStats: RewindPremiumStats
): Promise<unknown> {
	return updatePendingRecap(request, {
		aiRecapStatus: "ready",
		aiRecap,
		premiumStats
	});
}

function markRecapFailed(
	request: RecapRequest,
	premiumStats: RewindPremiumStats | null
): Promise<unknown> {
	return updatePendingRecap(request, {
		aiRecapStatus: "failed",
		...(premiumStats && { premiumStats })
	});
}

function spentProviderTokens(error: unknown): boolean {
	return REWIND_AI_TOKEN_SPENDING_ERROR_CODES.has(resolveErrorCode(error));
}

async function refundAiSpend(
	recordId: string,
	spend: RewindAiSpend
): Promise<void> {
	const where = { id: recordId };
	if (spend === "grace") {
		await RewindModel.update({ graceUsed: false }, { where });
		return;
	}
	await RewindModel.increment("regenerationsLeft", { by: 1, where });
}

export async function runRecap({
	owner,
	record,
	calendar,
	reusablePremiumStats,
	premiumAccess,
	spend
}: RecapRunInput): Promise<boolean> {
	const request: RecapRequest = {
		recordId: record.id,
		requestedAt: record.aiRecapRequestedAt ?? new Date()
	};
	let premiumStats: RewindPremiumStats | null = null;
	try {
		const sources = await gatherRecapSources(
			owner,
			record,
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
		await markRecapReady(request, aiRecap, premiumStats);
		return true;
	} catch (error) {
		const refundableSpend = spentProviderTokens(error) ? null : spend;
		logger.error("runRecap", "failed", {
			rewindId: record.id,
			year: record.year,
			code: resolveErrorCode(error),
			refunded: refundableSpend !== null,
			failures: findServiceErrorFailures(error)
		});
		await markRecapFailed(request, premiumStats);
		if (refundableSpend) await refundAiSpend(record.id, refundableSpend);
		return false;
	}
}

export async function storePremiumStats(
	owner: User,
	record: RewindModel
): Promise<void> {
	const { year } = record;
	const publicOnly = !record.includesPrivateRuns;
	try {
		const [runs, addedByMonth] = await Promise.all([
			findRewindRuns(owner.id, { publicOnly, includeNotes: false }),
			backlogRewindService.countRunsAddedByMonth(owner.id, year, {
				publicOnly
			})
		]);
		const genres = await gameGenreService.findGenresByGameIds(
			listActiveGameIds(runs, [year])
		);
		const premiumStats = buildRewindPremiumStats({
			year,
			runs,
			genres,
			addedByMonth
		});
		await RewindModel.update(
			{ premiumStats },
			{ where: { id: record.id } }
		);
	} catch (error) {
		logger.error("storePremiumStats", "failed", {
			rewindId: record.id,
			year,
			code: resolveErrorCode(error)
		});
	}
}

function publicPlatinumsFor(
	owner: User,
	includesPrivateRuns: boolean,
	year: number
): Promise<number | null> {
	if (!isSectionShared(owner.platinumVisibility, includesPrivateRuns))
		return Promise.resolve(null);
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
	if (!listRewindYears(sourceRuns, calendar).includes(previousYear))
		return null;

	const platinums = await publicPlatinumsFor(
		owner,
		record.includesPrivateRuns,
		previousYear
	);
	return buildYearTotals(sourceRuns, previousYear, genres, platinums);
}
