import { Op, QueryTypes, type Transaction } from "sequelize";

import { PinoLogger } from "../../common/logger/pino.logger";
import { sequelize } from "../../database/sequelize.database";
import * as gameGenreService from "../../game-genre/game-genre.service";
import * as gamePlatinumService from "../../game-platinum/game-platinum.service";
import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import * as rewindEditionsService from "../../rewind-editions/rewind-editions.service";
import { type User } from "../../users/user.model";
import * as usersService from "../../users/users.service";
import * as rewindServiceError from "../errors/rewind.service-error";
import { userToRewindOwner } from "../mappers/user-to-rewind-owner.mapper";
import {
	REWIND_FREEZE_ATTEMPTS,
	REWIND_FREEZE_BATCH_SIZE,
	REWIND_FREEZE_LOCK_KEY,
	REWIND_SNAPSHOT_SCHEMA_VERSION
} from "../rewind.constants";
import { type RewindSnapshot, type RewindView } from "../rewind.interface";
import { Rewind as RewindModel } from "../rewind.model";
import {
	type ClosedRewindEditions,
	type RewindFreezeOutcome,
	type RewindFreezeReport,
	type RewindFreezeTally,
	type RewindSnapshotContext
} from "../rewind-freeze.interface";
import { type RewindFreezeOutcomeKind } from "../rewind-freeze.types";
import { type RewindRun } from "../rewind-run.interface";
import { buildRewindView } from "../utils/build-rewind-view.util";
import { isAiRecapInProgress } from "../utils/is-ai-recap-in-progress.util";
import { listActiveGameIds } from "../utils/list-active-game-ids.util";
import { resolveCurrentRewindDay } from "../utils/resolve-current-rewind-day.util";
import { findRewindRuns } from "./rewind-runs.service";

const logger = new PinoLogger("Rewind Freeze");

const EMPTY_TALLY: RewindFreezeTally = { frozen: 0, pending: 0, failed: 0 };

async function findGeneratedYears(userId: string): Promise<Set<number>> {
	const records = await RewindModel.findAll({
		attributes: ["year"],
		where: { userId }
	});
	return new Set(records.map(record => record.year));
}

async function requireOwner(userId: string): Promise<User> {
	const owner = await usersService.findUserById(userId);
	if (!owner) throw rewindServiceError.userNotFoundError();
	return owner;
}

async function buildViewFor(
	owner: User,
	record: RewindModel,
	runs: RewindRun[],
	context: RewindSnapshotContext,
	isOwnerView: boolean
): Promise<RewindView | null> {
	const genres = await gameGenreService.findGenresByGameIds(
		listActiveGameIds(runs, [record.year, record.year - 1])
	);
	return buildRewindView({
		record,
		owner: userToRewindOwner(owner),
		runs,
		genres,
		platinums: context.platinums,
		previousYearPlatinums: context.previousYearPlatinums,
		calendar: context.calendar,
		visibility: {
			generatedYears: context.generatedYears,
			includeUngenerated: isOwnerView,
			frozenYearListing: new Map()
		},
		design: context.design,
		frozenAt: context.frozenAt,
		requireListedYear: !isOwnerView
	});
}

export async function buildRewindSnapshot(
	record: RewindModel,
	edition: RewindEditionRecord,
	frozenAt: Date
): Promise<RewindSnapshot> {
	const owner = await requireOwner(record.userId);
	const [
		ownerRuns,
		publicRuns,
		generatedYears,
		platinums,
		previousPlatinums
	] = await Promise.all([
		findRewindRuns(owner.id, { publicOnly: false, includeNotes: false }),
		findRewindRuns(owner.id, { publicOnly: true, includeNotes: false }),
		findGeneratedYears(owner.id),
		gamePlatinumService.countPlatinumsByUserIdAndYear(
			owner.id,
			record.year
		),
		gamePlatinumService.countPlatinumsByUserIdAndYear(
			owner.id,
			record.year - 1
		)
	]);
	const context: RewindSnapshotContext = {
		calendar: {
			today: resolveCurrentRewindDay(frozenAt),
			firstYear: owner.createdAt.getUTCFullYear(),
			edition,
			upcomingEdition: null
		},
		generatedYears,
		platinums,
		previousYearPlatinums: previousPlatinums,
		design: edition.design,
		frozenAt: frozenAt.toISOString()
	};
	const [ownerView, publicView] = await Promise.all([
		buildViewFor(owner, record, ownerRuns, context, true),
		buildViewFor(owner, record, publicRuns, context, false)
	]);

	return {
		schemaVersion: REWIND_SNAPSHOT_SCHEMA_VERSION,
		design: context.design,
		frozenAt: context.frozenAt,
		owner: ownerView!,
		public: publicView
	};
}

function lockRewind(recordId: string, transaction: Transaction) {
	return RewindModel.findByPk(recordId, {
		lock: transaction.LOCK.UPDATE,
		transaction
	});
}

function unfreezableOutcome(
	record: RewindModel | null,
	now: Date
): RewindFreezeOutcome | null {
	if (!record) return { kind: "missing", record: null };
	if (record.frozenAt) return { kind: "already-frozen", record };
	if (isAiRecapInProgress(record, now)) return { kind: "pending", record };
	return null;
}

function writeSnapshotIfUnchanged(
	builtFrom: RewindModel,
	snapshot: RewindSnapshot,
	now: Date
): Promise<RewindFreezeOutcome | null> {
	return sequelize.transaction(async transaction => {
		const record = await lockRewind(builtFrom.id, transaction);
		const outcome = unfreezableOutcome(record, now);
		if (outcome || !record) return outcome;
		if (record.updatedAt.getTime() !== builtFrom.updatedAt.getTime())
			return null;

		await record.update({ snapshot, frozenAt: now }, { transaction });
		return { kind: "frozen", record };
	});
}

export async function freezeRewind(
	recordId: string,
	edition: RewindEditionRecord,
	now: Date = new Date()
): Promise<RewindFreezeOutcome> {
	let latest: RewindModel | null = null;
	for (let attempt = 0; attempt < REWIND_FREEZE_ATTEMPTS; attempt++) {
		latest = await RewindModel.findByPk(recordId);
		const outcome = unfreezableOutcome(latest, now);
		if (outcome || !latest)
			return outcome ?? { kind: "missing", record: null };

		const snapshot = await buildRewindSnapshot(latest, edition, now);
		const written = await writeSnapshotIfUnchanged(latest, snapshot, now);
		if (written) return written;
	}
	return { kind: "pending", record: latest };
}

async function acquireFreezeLock(transaction: Transaction): Promise<boolean> {
	const [row] = await sequelize.query<{ locked: boolean }>(
		"SELECT pg_try_advisory_xact_lock(hashtext(:key)) AS locked",
		{
			replacements: { key: REWIND_FREEZE_LOCK_KEY },
			type: QueryTypes.SELECT,
			transaction
		}
	);
	return row?.locked === true;
}

async function findClosedEditions(
	today: Date
): Promise<ClosedRewindEditions | null> {
	const years =
		await rewindEditionsService.findClosedUnfrozenRewindEditionYears(today);
	const latestYear = years.at(-1);
	if (latestYear === undefined) return null;
	const latest =
		await rewindEditionsService.findRewindEditionByYear(latestYear);
	return latest ? { years, latest } : null;
}

async function findUnfrozenRewindIds(after: string | null): Promise<string[]> {
	const records = await RewindModel.findAll({
		attributes: ["id"],
		where: {
			frozenAt: null,
			...(after !== null && { id: { [Op.gt]: after } })
		},
		order: [["id", "ASC"]],
		limit: REWIND_FREEZE_BATCH_SIZE
	});
	return records.map(record => record.id);
}

async function freezeSafely(
	recordId: string,
	edition: RewindEditionRecord
): Promise<RewindFreezeOutcomeKind | "failed"> {
	try {
		const outcome = await freezeRewind(recordId, edition);
		return outcome.kind;
	} catch (error) {
		logger.error("freezeRewind", "failed", {
			rewindId: recordId,
			year: edition.year,
			error: error instanceof Error ? error.message : String(error)
		});
		return "failed";
	}
}

function addToTally(
	tally: RewindFreezeTally,
	kind: RewindFreezeOutcomeKind | "failed"
): RewindFreezeTally {
	if (kind === "frozen") return { ...tally, frozen: tally.frozen + 1 };
	if (kind === "pending") return { ...tally, pending: tally.pending + 1 };
	if (kind === "failed") return { ...tally, failed: tally.failed + 1 };
	return tally;
}

async function freezeLiveRewinds(
	edition: RewindEditionRecord
): Promise<RewindFreezeTally> {
	let tally = EMPTY_TALLY;
	let cursor: string | null = null;
	let batch = await findUnfrozenRewindIds(cursor);
	while (batch.length > 0) {
		for (const recordId of batch)
			tally = addToTally(tally, await freezeSafely(recordId, edition));
		cursor = batch.at(-1) ?? null;
		batch = await findUnfrozenRewindIds(cursor);
	}
	return tally;
}

async function freezeEditions(
	closed: ClosedRewindEditions,
	today: Date
): Promise<RewindFreezeReport> {
	const openEdition =
		await rewindEditionsService.findCurrentRewindEdition(today);
	const tally = openEdition
		? EMPTY_TALLY
		: await freezeLiveRewinds(closed.latest);
	const settled = tally.pending === 0 && tally.failed === 0;
	if (settled)
		await rewindEditionsService.markRewindEditionsFrozen(
			closed.years,
			new Date()
		);
	return {
		locked: true,
		closedEditions: closed.years,
		frozenEditions: settled ? closed.years : [],
		...tally
	};
}

export function freezeClosedRewindEditions(
	now: Date = new Date()
): Promise<RewindFreezeReport> {
	return sequelize.transaction(async transaction => {
		if (!(await acquireFreezeLock(transaction)))
			return {
				locked: false,
				closedEditions: [],
				frozenEditions: [],
				...EMPTY_TALLY
			};

		const today = resolveCurrentRewindDay(now);
		const closed = await findClosedEditions(today);
		if (!closed)
			return {
				locked: true,
				closedEditions: [],
				frozenEditions: [],
				...EMPTY_TALLY
			};
		return freezeEditions(closed, today);
	});
}
