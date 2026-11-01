import { type Request } from "express";

import { type DomainError } from "../../common/errors/domain-error";
import { HttpError } from "../../common/errors/http-error";

export function premiumAccessDomainToHttpMapper(
	error: DomainError,
	request: Request
): HttpError {
	const statusByCode: Record<string, number> = {
		PREMIUM_GRANT_NOT_FOUND: 404,
		PREMIUM_GRANT_INVALID_EXPIRATION: 422,
		PREMIUM_PROMOTION_NOT_FOUND: 404,
		PREMIUM_PROMOTION_INVALID_DATES: 422,
		PREMIUM_PROMOTION_CODE_CONFLICT: 409,
		GIFT_OFFER_NOT_FOUND: 404,
		GIFT_OFFER_NOT_ELIGIBLE: 409
	};

	return new HttpError({
		type: error.code,
		title: error.message,
		status: statusByCode[error.code] ?? 500,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.locals?.correlationId as string,
		context: error.context
	});
}
