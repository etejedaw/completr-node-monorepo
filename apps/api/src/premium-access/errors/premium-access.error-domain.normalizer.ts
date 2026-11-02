import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import { premiumAccessServiceToDomainMapper } from "./premium-access.service-to-domain.mapper";

export function premiumAccessErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;

	if (error instanceof ServiceError)
		return premiumAccessServiceToDomainMapper(error, correlationId);

	return new DomainError(
		"COMMON",
		"INTERNAL_ERROR",
		"Unexpected internal error",
		{
			raw: error,
			correlationId
		}
	);
}
