import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as premiumAccessDomainError from "./premium-access.domain-error";

export function premiumAccessServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };
	if (error.code === "PREMIUM_PROMOTION_NOT_FOUND")
		return premiumAccessDomainError.premiumPromotionNotFound(context);
	if (error.code === "PREMIUM_PROMOTION_INVALID_DATES")
		return premiumAccessDomainError.premiumPromotionInvalidDates(context);
	if (error.code === "PREMIUM_PROMOTION_ENDED")
		return premiumAccessDomainError.premiumPromotionEnded(context);
	if (error.code === "PREMIUM_PROMOTION_CODE_CONFLICT")
		return premiumAccessDomainError.premiumPromotionCodeConflict(context);
	if (error.code === "PREMIUM_GRANT_NOT_ACTIVE")
		return premiumAccessDomainError.premiumGrantNotActive(context);
	if (error.code === "PREMIUM_GRANT_NOT_FOUND")
		return premiumAccessDomainError.premiumGrantNotFound(context);
	if (error.code === "PREMIUM_GRANT_INVALID_EXPIRATION")
		return premiumAccessDomainError.premiumGrantInvalidExpiration(context);
	if (error.code === "GIFT_OFFER_NOT_FOUND")
		return premiumAccessDomainError.giftOfferNotFound(context);
	if (error.code === "GIFT_OFFER_NOT_ELIGIBLE")
		return premiumAccessDomainError.giftOfferNotEligible(context);
	return premiumAccessDomainError.premiumAccessInternalError(context);
}
