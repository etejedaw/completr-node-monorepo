import { type ErrorDomainNormalizer } from "../types/error.types";
import { commonInternalError } from "./common.domain-error";
import { DomainError } from "./domain-error";
import { ServiceError } from "./service-error";

export function buildErrorDomainNormalizer(
	serviceToDomainMapper: (
		error: ServiceError,
		correlationId: string
	) => DomainError
): ErrorDomainNormalizer {
	return (error, correlationId) => {
		if (error instanceof DomainError) return error;
		if (error instanceof ServiceError)
			return serviceToDomainMapper(error, correlationId);
		return commonInternalError({ raw: error, correlationId });
	};
}
