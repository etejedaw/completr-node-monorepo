import { Op, QueryTypes, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import * as rewindService from "../rewind/rewind.service";
import { type CreateRewindEditionDto } from "./dtos/create-rewind-edition.dto";
import { type UpdateRewindEditionDto } from "./dtos/update-rewind-edition.dto";
import * as rewindEditionsServiceError from "./errors/rewind-editions.service-error";
import { RewindEdition } from "./rewind-edition.model";
import { REWIND_EDITIONS_WRITE_LOCK_KEY } from "./rewind-editions.constants";
import { toRewindEditionRecord } from "./rewind-editions.service";
import {
	type RewindEditionUpdateResult,
	type RewindEditionWithStats
} from "./rewind-editions-admin.interface";

async function lockEditionsWrites(transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
		replacements: { key: REWIND_EDITIONS_WRITE_LOCK_KEY },
		type: QueryTypes.SELECT,
		transaction
	});
}

async function requireNoOverlap(
	dto: Pick<CreateRewindEditionDto, "opensAt" | "closesAt">,
	ownYear: number,
	transaction: Transaction
) {
	const overlapping = await RewindEdition.findOne({
		attributes: ["id"],
		where: {
			year: { [Op.ne]: ownYear },
			opensAt: { [Op.lte]: dto.closesAt },
			closesAt: { [Op.gte]: dto.opensAt }
		},
		transaction
	});
	if (overlapping) throw rewindEditionsServiceError.editionOverlapError();
}

export async function findRewindEditionsWithStats(): Promise<
	RewindEditionWithStats[]
> {
	const editions = await RewindEdition.findAll({
		order: [
			["year", "DESC"],
			["id", "DESC"]
		]
	});
	const generatedByYear = await rewindService.countRewindsByYear(
		editions.map(edition => edition.year)
	);
	return editions.map(edition => ({
		edition: toRewindEditionRecord(edition),
		generatedCount: generatedByYear.get(edition.year) ?? 0
	}));
}

export async function createRewindEdition(
	dto: CreateRewindEditionDto
): Promise<RewindEditionWithStats> {
	return sequelize.transaction(async transaction => {
		try {
			await lockEditionsWrites(transaction);
			const existing = await RewindEdition.findOne({
				attributes: ["id"],
				where: { year: dto.year },
				transaction
			});
			if (existing) throw rewindEditionsServiceError.editionExistsError();
			await requireNoOverlap(dto, dto.year, transaction);
			const edition = await RewindEdition.create(
				{
					year: dto.year,
					opensAt: dto.opensAt,
					closesAt: dto.closesAt,
					graceStartsAt: dto.graceStartsAt,
					graceEndsAt: dto.graceEndsAt,
					design: dto.design,
					premiumRegenerations: dto.premiumRegenerations,
					giftRegenerations: dto.giftRegenerations
				},
				{ transaction }
			);
			return {
				edition: toRewindEditionRecord(edition),
				generatedCount: await rewindService.countRewindsOfYear(
					dto.year,
					transaction
				)
			};
		} catch (error) {
			rethrowSequelizeError(error, {
				unique: rewindEditionsServiceError.editionExistsError,
				validation: rewindEditionsServiceError.editionInvalidError
			});
		}
	});
}

async function shiftGeneratedQuotas(
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

export async function updateRewindEdition(
	year: number,
	dto: UpdateRewindEditionDto
): Promise<RewindEditionUpdateResult> {
	return sequelize.transaction(async transaction => {
		try {
			await lockEditionsWrites(transaction);
			const edition = await RewindEdition.findOne({
				where: { year },
				lock: transaction.LOCK.UPDATE,
				transaction
			});
			if (!edition)
				throw rewindEditionsServiceError.editionNotFoundError();
			if (edition.frozenAt)
				throw rewindEditionsServiceError.editionFrozenError();
			await requireNoOverlap(dto, year, transaction);

			const premiumDelta =
				dto.premiumRegenerations - edition.premiumRegenerations;
			const giftDelta = dto.giftRegenerations - edition.giftRegenerations;

			await edition.update(
				{
					opensAt: dto.opensAt,
					closesAt: dto.closesAt,
					graceStartsAt: dto.graceStartsAt,
					graceEndsAt: dto.graceEndsAt,
					design: dto.design,
					premiumRegenerations: dto.premiumRegenerations,
					giftRegenerations: dto.giftRegenerations
				},
				{ transaction }
			);
			const affectedRewinds = dto.applyToGenerated
				? await shiftGeneratedQuotas(
						year,
						premiumDelta,
						giftDelta,
						transaction
					)
				: 0;
			return {
				edition: toRewindEditionRecord(edition),
				generatedCount: await rewindService.countRewindsOfYear(
					year,
					transaction
				),
				affectedRewinds
			};
		} catch (error) {
			rethrowSequelizeError(error, {
				validation: rewindEditionsServiceError.editionInvalidError
			});
		}
	});
}
