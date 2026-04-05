import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import { listItemsServiceToDomainMapper } from "./list-items.service-to-domain.mapper";

export function listItemsErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;

	if (error instanceof ServiceError)
		return listItemsServiceToDomainMapper(error, correlationId);

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
