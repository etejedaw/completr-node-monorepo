import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as premiumAccessDomainError from "./premium-access.domain-error";

export function premiumAccessServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };
	return premiumAccessDomainError.premiumAccessInternalError(context);
}
