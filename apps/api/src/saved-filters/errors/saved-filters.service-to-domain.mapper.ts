import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as savedFilterDomainError from "./saved-filters.domain-error";

export function savedFiltersServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "SAVED_FILTER_NOT_FOUND")
		return savedFilterDomainError.savedFilterNotFound(context);

	if (error.code === "SAVED_FILTER_FORBIDDEN")
		return savedFilterDomainError.savedFilterForbidden(context);

	if (error.code === "SAVED_FILTER_LIMIT_REACHED")
		return savedFilterDomainError.savedFilterLimitReached(context);

	if (error.code === "SAVED_FILTER_FROZEN")
		return savedFilterDomainError.savedFilterFrozen(context);

	return new DomainError(
		"SavedFilter Module",
		"SAVED_FILTER_INTERNAL_ERROR",
		"Unexpected SavedFilter Service error",
		context
	);
}
