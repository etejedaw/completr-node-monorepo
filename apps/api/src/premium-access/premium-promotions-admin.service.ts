import { type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { sequelize } from "../database/sequelize.database";
import { type CreatePremiumPromotionDto } from "./dtos/create-premium-promotion.dto";
import { type UpdatePremiumPromotionDto } from "./dtos/update-premium-promotion.dto";
import * as premiumAccessServiceError from "./errors/premium-access.service-error";
import { PremiumGrant } from "./premium-grant.model";
import { PremiumPromotion } from "./premium-promotion.model";

export async function findPremiumPromotions() {
	return PremiumPromotion.findAll({
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function createPremiumPromotion(
	dto: CreatePremiumPromotionDto,
	now = new Date()
) {
	const period = resolvePeriod(dto.startsAt, dto.endsAt, now);
	try {
		return await PremiumPromotion.create({
			code: dto.code,
			feature: dto.feature,
			startsAt: period.startsAt,
			endsAt: period.endsAt
		});
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
) {
	return sequelize.transaction(async transaction => {
		try {
			const promotion = await requirePromotion(promotionId, transaction);
			const period = resolvePeriod(
				dto.startsAt ?? promotion.startsAt,
				dto.endsAt ?? promotion.endsAt,
				now
			);
			await promotion.update(period, { transaction });
			await PremiumGrant.update(
				{ expiresAt: period.endsAt },
				{
					where: { offerCode: promotion.code },
					transaction
				}
			);
			return promotion;
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
) {
	return sequelize.transaction(async transaction => {
		const promotion = await requirePromotion(promotionId, transaction);
		await promotion.update(
			{
				startsAt: promotion.startsAt > now ? now : promotion.startsAt,
				endsAt: now
			},
			{ transaction }
		);
		await PremiumGrant.update(
			{ expiresAt: now },
			{ where: { offerCode: promotion.code }, transaction }
		);
		return promotion;
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
