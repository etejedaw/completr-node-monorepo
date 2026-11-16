import { type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { sequelize } from "../../database/sequelize.database";
import { type User } from "../../users/user.model";
import { type AddRewindAiRecapDto } from "../dtos/add-rewind-ai-recap.dto";
import { type GenerateRewindDto } from "../dtos/generate-rewind.dto";
import * as rewindServiceError from "../errors/rewind.service-error";
import { type RewindPremiumAccessKind } from "../rewind.constants";
import { Rewind as RewindModel } from "../rewind.model";
import {
	type RewindAiBudget,
	type RewindAiRecapReservation,
	type RewindGenerationReservation
} from "../rewind-generation.interface";
import { type SpendableRewindAiBudget } from "../rewind-generation.types";
import { rewindAiRecapDailyLimiter } from "../rewind-rate-limiter.config";
import { type RewindCalendar } from "../rewind-run.interface";
import { consumeAiRecapDailyQuota } from "../utils/consume-ai-recap-daily-quota.util";
import { isAiRecapInProgress } from "../utils/is-ai-recap-in-progress.util";
import { nextGeneratedAt } from "../utils/next-generated-at.util";
import { planRewindGeneration } from "../utils/plan-rewind-generation.util";
import { resolveRewindAiBudget } from "../utils/resolve-rewind-ai-budget.util";
import { resolveRewindAiUseChanges } from "../utils/resolve-rewind-ai-use-changes.util";
import { resolveRewindGenerationBlocker } from "../utils/resolve-rewind-generation-blocker.util";

const UNFROZEN_FIELDS = { snapshot: null, frozenAt: null };

function lockRecord(userId: string, year: number, transaction: Transaction) {
	return RewindModel.findOne({
		where: { userId, year },
		lock: transaction.LOCK.UPDATE,
		transaction
	});
}

function creationBudget(
	budget: RewindAiBudget,
	dto: GenerateRewindDto
): RewindAiBudget {
	return dto.writeAiRecap ? budget : { ...budget, spend: null };
}

async function requireAiRecapQuota(
	owner: User,
	budget: RewindAiBudget
): Promise<void> {
	if (budget.spend)
		await consumeAiRecapDailyQuota(rewindAiRecapDailyLimiter, owner);
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

export async function reserveGeneration(
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
			const budget = creationBudget(plan.budget, dto);
			await requireAiRecapQuota(owner, budget);
			return {
				record: await createRecord(
					owner,
					year,
					dto,
					budget,
					transaction
				),
				created: true,
				spend: budget.spend
			};
		}
		await requireAiRecapQuota(owner, plan.budget);
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

export function requireGenerationAllowed(
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

export async function reserveAiRecap(
	owner: User,
	year: number,
	dto: AddRewindAiRecapDto,
	calendar: RewindCalendar,
	accessKind: RewindPremiumAccessKind | null
): Promise<RewindAiRecapReservation> {
	return sequelize.transaction(async transaction => {
		const record = await lockRecord(owner.id, year, transaction);
		if (!record) throw rewindServiceError.notGeneratedError();
		const now = new Date();
		const budget = requireAiRecapAllowed(record, calendar, accessKind, now);
		await requireAiRecapQuota(owner, budget);

		return {
			record: await record.update(
				{
					includesPrivateRuns: dto.includePrivateRuns,
					includesNotes: dto.includeNotes,
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
