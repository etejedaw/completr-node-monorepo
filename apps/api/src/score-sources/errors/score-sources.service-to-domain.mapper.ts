import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as scoreSourceDomainError from "./score-sources.domain-error";

export function scoreSourcesServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "SCORE_SOURCE_UNIQUE_CONSTRAINT")
		return scoreSourceDomainError.scoreSourceAlreadyExists(context);

	return scoreSourceDomainError.scoreSourceInternalError(context);
}
