import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as platformDomainError from "./platform.domain-error";

export function platformsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "PLATFORM_NOT_FOUND")
		return platformDomainError.platformNotFound(context);

	if (error.code === "PLATFORM_UNIQUE_CONSTRAINT")
		return platformDomainError.platformUniqueConstraint(context);

	if (error.code === "PLATFORM_VALIDATION_ERROR")
		return platformDomainError.platformValidation(context);

	return platformDomainError.platformInternalError(context);
}
