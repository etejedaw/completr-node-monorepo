import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as playthroughDomainError from "./playthroughs.domain-error";

export function playthroughsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "PLAYTHROUGH_NOT_FOUND")
		return playthroughDomainError.playthroughNotFound(context);

	if (error.code === "PLAYTHROUGH_FORBIDDEN")
		return playthroughDomainError.playthroughForbidden(context);

	if (error.code === "PLAYTHROUGH_VALIDATION_ERROR")
		return playthroughDomainError.playthroughValidation(context);

	return playthroughDomainError.playthroughInternalError(context);
}
