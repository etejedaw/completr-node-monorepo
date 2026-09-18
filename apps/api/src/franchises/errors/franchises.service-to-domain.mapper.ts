import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as franchiseDomainError from "./franchises.domain-error";

export function franchisesServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "FRANCHISE_NOT_FOUND")
		return franchiseDomainError.franchiseNotFound(context);

	if (error.code === "FRANCHISE_UNIQUE_CONSTRAINT")
		return franchiseDomainError.franchiseUniqueConstraint(context);

	if (error.code === "FRANCHISE_VALIDATION_ERROR")
		return franchiseDomainError.franchiseValidation(context);

	return franchiseDomainError.franchiseInternalError(context);
}
