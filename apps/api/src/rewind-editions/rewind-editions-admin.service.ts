import { Op, QueryTypes, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import { Rewind } from "../rewind/rewind.model";
import * as rewindEditionsServiceError from "./errors/rewind-editions.service-error";
import { RewindEdition } from "./rewind-edition.model";
import { type RewindEditionRecord } from "./rewind-editions.interface";
import {
	type RewindEditionUpdateResult,
	type RewindEditionWithStats
} from "./rewind-editions-admin.interface";
import {
	type CreateRewindEditionDto,
	type UpdateRewindEditionDto
} from "./schemas/rewind-editions-admin.schemas";

const EDITIONS_WRITE_LOCK_KEY = 726_001;

function toRecord(edition: RewindEdition): RewindEditionRecord {
	return {
		year: edition.year,
		opensAt: edition.opensAt,
		closesAt: edition.closesAt,
		graceStartsAt: edition.graceStartsAt,
		graceEndsAt: edition.graceEndsAt,
		design: edition.design,
		premiumRegenerations: edition.premiumRegenerations,
		giftRegenerations: edition.giftRegenerations,
		frozenAt: edition.frozenAt
	};
}

async function lockEditionsWrites(transaction: Transaction) {
	await sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
		replacements: { key: EDITIONS_WRITE_LOCK_KEY },
		type: QueryTypes.SELECT,
		transaction
	});
}

async function countGeneratedByYear(
	years: number[]
): Promise<Map<number, number>> {
	if (years.length === 0) return new Map();
	const counts = (await Rewind.count({
		where: { year: { [Op.in]: years } },
		group: ["year"]
	})) as unknown as { year: number; count: number }[];
	return new Map(counts.map(row => [row.year, row.count]));
}

async function countGenerated(year: number, transaction?: Transaction) {
	return Rewind.count({ where: { year }, transaction });
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
	const generatedByYear = await countGeneratedByYear(
		editions.map(edition => edition.year)
	);
	return editions.map(edition => ({
		edition: toRecord(edition),
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
				edition: toRecord(edition),
				generatedCount: await countGenerated(dto.year, transaction)
			};
		} catch (error) {
			rethrowSequelizeError(error, {
				unique: rewindEditionsServiceError.editionExistsError
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
		await lockEditionsWrites(transaction);
		const edition = await RewindEdition.findOne({
			where: { year },
			lock: transaction.LOCK.UPDATE,
			transaction
		});
		if (!edition) throw rewindEditionsServiceError.editionNotFoundError();
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
			edition: toRecord(edition),
			generatedCount: await countGenerated(year, transaction),
			affectedRewinds
		};
	});
}
