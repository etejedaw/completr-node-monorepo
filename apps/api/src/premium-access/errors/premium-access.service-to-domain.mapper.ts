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
	return premiumAccessDomainError.premiumAccessInternalError(context);
}
