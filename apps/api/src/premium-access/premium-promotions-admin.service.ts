import { Op, type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import { type CreatePremiumPromotionDto } from "./dtos/create-premium-promotion.dto";
import { type UpdatePremiumPromotionDto } from "./dtos/update-premium-promotion.dto";
import * as premiumAccessServiceError from "./errors/premium-access.service-error";
import { type PremiumPromotionWithClaims } from "./premium-access.interface";
import { PremiumGrant } from "./premium-grant.model";
import { PremiumPromotion } from "./premium-promotion.model";

export async function findPremiumPromotions(): Promise<
	PremiumPromotionWithClaims[]
> {
	const promotions = await PremiumPromotion.findAll({
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
	const claimCounts = await countClaimsByCode(
		promotions.map(promotion => promotion.code)
	);
	return promotions.map(promotion => ({
		promotion,
		claimCount: claimCounts.get(promotion.code) ?? 0
	}));
}

export async function createPremiumPromotion(
	dto: CreatePremiumPromotionDto,
	now = new Date()
): Promise<PremiumPromotionWithClaims> {
	const period = resolvePeriod(dto.startsAt, dto.endsAt, now);
	try {
		const promotion = await PremiumPromotion.create({
			code: dto.code,
			feature: dto.feature,
			startsAt: period.startsAt,
			endsAt: period.endsAt
		});
		return { promotion, claimCount: 0 };
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: premiumAccessServiceError.premiumPromotionCodeConflict,
			validation: premiumAccessServiceError.premiumPromotionInvalidDates
		});
	}
}

export async function updatePremiumPromotion(
	promotionId: string,
	dto: UpdatePremiumPromotionDto,
	now = new Date()
): Promise<PremiumPromotionWithClaims> {
	return sequelize.transaction(async transaction => {
		try {
			const promotion = await requirePromotion(promotionId, transaction);
			if (promotion.endsAt <= now)
				throw premiumAccessServiceError.premiumPromotionEnded();
			const period = resolvePeriod(
				dto.startsAt ?? promotion.startsAt,
				dto.endsAt ?? promotion.endsAt,
				now
			);
			await promotion.update(period, { transaction });
			await PremiumGrant.update(
				{ expiresAt: period.endsAt },
				{
					where: {
						offerCode: promotion.code,
						...grantsActiveAfter(now)
					},
					transaction
				}
			);
			return withClaimCount(promotion, transaction);
		} catch (error) {
			rethrowSequelizeError(error, {
				validation:
					premiumAccessServiceError.premiumPromotionInvalidDates
			});
		}
	});
}

export async function revokePremiumPromotion(
	promotionId: string,
	now = new Date()
): Promise<PremiumPromotionWithClaims> {
	return sequelize.transaction(async transaction => {
		const promotion = await requirePromotion(promotionId, transaction);
		const revokedAt = promotion.endsAt < now ? promotion.endsAt : now;
		await promotion.update(
			{
				startsAt:
					promotion.startsAt > revokedAt
						? revokedAt
						: promotion.startsAt,
				endsAt: revokedAt
			},
			{ transaction }
		);
		await PremiumGrant.update(
			{ expiresAt: revokedAt },
			{
				where: {
					offerCode: promotion.code,
					...grantsActiveAfter(revokedAt)
				},
				transaction
			}
		);
		return withClaimCount(promotion, transaction);
	});
}

async function requirePromotion(promotionId: string, transaction: Transaction) {
	const promotion = await PremiumPromotion.findByPk(promotionId, {
		transaction,
		lock: transaction.LOCK.UPDATE
	});
	if (!promotion) throw premiumAccessServiceError.premiumPromotionNotFound();
	return promotion;
}

function grantsActiveAfter(instant: Date) {
	return {
		[Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: instant } }]
	};
}

async function withClaimCount(
	promotion: PremiumPromotion,
	transaction: Transaction
) {
	const claimCounts = await countClaimsByCode([promotion.code], transaction);
	return { promotion, claimCount: claimCounts.get(promotion.code) ?? 0 };
}

async function countClaimsByCode(codes: string[], transaction?: Transaction) {
	if (codes.length === 0) return new Map<string, number>();
	const rows = (await PremiumGrant.findAll({
		attributes: [
			"offerCode",
			[sequelize.fn("COUNT", sequelize.col("id")), "count"]
		],
		where: {
			offerCode: { [Op.in]: codes },
			userId: { [Op.not]: null }
		},
		group: ["offerCode"],
		raw: true,
		transaction
	})) as unknown as { offerCode: string; count: string }[];
	return new Map(rows.map(row => [row.offerCode, Number(row.count)]));
}

function resolvePeriod(
	startsAtInput: string | Date,
	endsAtInput: string | Date,
	now: Date
) {
	const startsAt = new Date(startsAtInput);
	const endsAt = new Date(endsAtInput);
	if (endsAt <= startsAt || endsAt <= now)
		throw premiumAccessServiceError.premiumPromotionInvalidDates();
	return { startsAt, endsAt };
}
