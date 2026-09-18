import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as reviewDomainError from "./reviews.domain-error";

export function reviewsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "REVIEW_NOT_FOUND")
		return reviewDomainError.reviewNotFound(context);

	if (error.code === "REVIEW_FORBIDDEN")
		return reviewDomainError.reviewForbidden(context);

	if (error.code === "REVIEW_ALREADY_EXISTS")
		return reviewDomainError.reviewAlreadyExists(context);

	if (error.code === "REVIEW_GAME_NOT_FOUND")
		return reviewDomainError.gameNotFound(context);

	return reviewDomainError.reviewInternalError(context);
}
