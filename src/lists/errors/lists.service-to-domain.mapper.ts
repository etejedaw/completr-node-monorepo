import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as listDomainError from "./lists.domain-error";

export function listsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "LIST_NOT_FOUND")
		return listDomainError.listNotFound(context);

	if (error.code === "LIST_FORBIDDEN")
		return listDomainError.listForbidden(context);

	if (error.code === "LIST_UNIQUE_CONSTRAINT")
		return listDomainError.listUniqueConstraint(context);

	if (error.code === "LIST_VALIDATION_ERROR")
		return listDomainError.listValidation(context);

	if (error.code === "LIST_LIMIT_REACHED")
		return listDomainError.listLimitReached(context);

	if (error.code === "LIST_FROZEN")
		return listDomainError.listFrozen(context);

	return listDomainError.listInternalError(context);
}
