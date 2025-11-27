import { authErrorDomainNormalizer } from "../../auth/errors/auth.error-domain.normalizer";
import { usersErrorDomainNormalizer } from "../../users/errors/users.error-domain.normalizer";
import { DomainError } from "./domain-error";
import { ServiceError } from "./service-error";

export function globalErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;

	if (error instanceof ServiceError)
		return globalServiceErrorMapper(error, correlationId);

	return new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error", {
		raw: error,
		correlationId
	});
}

function globalServiceErrorMapper(
	error: ServiceError,
	correlationId: string
): DomainError {
	if (error.serviceError.service === "Users Service")
		return usersErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Auth Service")
		return authErrorDomainNormalizer(error, correlationId);

	return new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error", {
		raw: error,
		correlationId
	});
}
