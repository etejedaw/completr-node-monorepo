import { type Request, type Response } from "express";

import * as auditService from "../audit/audit.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type CreatePremiumPromotionDto } from "./dtos/create-premium-promotion.dto";
import { type UpdatePremiumPromotionDto } from "./dtos/update-premium-promotion.dto";
import { premiumPromotionSerializer } from "./premium-access.serializer";
import * as premiumPromotionsAdminService from "./premium-promotions-admin.service";
import { type PremiumPromotionParams } from "./schemas/premium-promotion.schemas";

export async function getPremiumPromotions(
	_request: Request,
	response: Response
) {
	const promotions =
		await premiumPromotionsAdminService.findPremiumPromotions();
	return response.status(200).json({
		data: { promotions: promotions.map(premiumPromotionSerializer) }
	});
}

export async function postPremiumPromotion(
	request: Request,
	response: Response
) {
	const dto = request.locals.body as CreatePremiumPromotionDto;
	const admin = request.locals.user as RequestUser;
	const promotion =
		await premiumPromotionsAdminService.createPremiumPromotion(dto);
	auditService.record(
		admin.id,
		"premium_promotion_created",
		"premium_promotion",
		promotion.id
	);
	return response
		.status(201)
		.json({ data: { promotion: premiumPromotionSerializer(promotion) } });
}

export async function patchPremiumPromotion(
	request: Request,
	response: Response
) {
	const { promotionId } = request.locals.params as PremiumPromotionParams;
	const dto = request.locals.body as UpdatePremiumPromotionDto;
	const admin = request.locals.user as RequestUser;
	const promotion =
		await premiumPromotionsAdminService.updatePremiumPromotion(
			promotionId,
			dto
		);
	auditService.record(
		admin.id,
		"premium_promotion_updated",
		"premium_promotion",
		promotion.id
	);
	return response
		.status(200)
		.json({ data: { promotion: premiumPromotionSerializer(promotion) } });
}

export async function postRevokePremiumPromotion(
	request: Request,
	response: Response
) {
	const { promotionId } = request.locals.params as PremiumPromotionParams;
	const admin = request.locals.user as RequestUser;
	const promotion =
		await premiumPromotionsAdminService.revokePremiumPromotion(promotionId);
	auditService.record(
		admin.id,
		"premium_promotion_revoked",
		"premium_promotion",
		promotion.id
	);
	return response
		.status(200)
		.json({ data: { promotion: premiumPromotionSerializer(promotion) } });
}
