import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Premium Access Module";

export function premiumPromotionNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_PROMOTION_NOT_FOUND",
		"Premium promotion not found",
		context
	);
}

export function premiumPromotionInvalidDates(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_PROMOTION_INVALID_DATES",
		"The promotion must end after its start date and in the future",
		context
	);
}

export function premiumPromotionEnded(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_PROMOTION_ENDED",
		"An ended promotion cannot be edited",
		context
	);
}

export function premiumPromotionCodeConflict(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_PROMOTION_CODE_CONFLICT",
		"A premium promotion with this code already exists",
		context
	);
}

export function premiumGrantNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_GRANT_NOT_FOUND",
		"Premium grant not found",
		context
	);
}

export function premiumGrantInvalidExpiration(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_GRANT_INVALID_EXPIRATION",
		"Full premium requires an expiration date and all new expiration dates must be in the future",
		context
	);
}

export function giftOfferNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GIFT_OFFER_NOT_FOUND",
		"Gift offer not found",
		context
	);
}

export function giftOfferNotEligible(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GIFT_OFFER_NOT_ELIGIBLE",
		"This gift offer is not available for your account",
		context
	);
}

export function premiumAccessInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PREMIUM_ACCESS_INTERNAL_ERROR",
		"Unexpected Premium Access Service error",
		context
	);
}
