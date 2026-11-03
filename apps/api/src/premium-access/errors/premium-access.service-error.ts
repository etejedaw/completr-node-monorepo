import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Premium Access Service" };

export function premiumPromotionNotFound() {
	return new ServiceError("PREMIUM_PROMOTION_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function premiumPromotionInvalidDates(raw?: unknown) {
	return new ServiceError("PREMIUM_PROMOTION_INVALID_DATES", {
		...BASE_OPTIONS,
		raw
	});
}

export function premiumPromotionEnded() {
	return new ServiceError("PREMIUM_PROMOTION_ENDED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function premiumPromotionCodeConflict(raw?: unknown) {
	return new ServiceError("PREMIUM_PROMOTION_CODE_CONFLICT", {
		...BASE_OPTIONS,
		raw
	});
}

export function premiumGrantNotActive() {
	return new ServiceError("PREMIUM_GRANT_NOT_ACTIVE", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function internalError(raw: unknown) {
	return new ServiceError("PREMIUM_ACCESS_INTERNAL_ERROR", {
		...BASE_OPTIONS,
		raw
	});
}
