import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as backlogDomainError from "./backlog.domain-error";

export function backlogServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "BACKLOG_NOT_FOUND")
		return backlogDomainError.backlogNotFound(context);

	if (error.code === "BACKLOG_FORBIDDEN")
		return backlogDomainError.backlogForbidden(context);

	if (error.code === "BACKLOG_VALIDATION_ERROR")
		return backlogDomainError.backlogValidation(context);

	if (error.code === "BACKLOG_COMPILATION_CONTEXT_INVALID")
		return backlogDomainError.backlogCompilationContextInvalid(context);

	return backlogDomainError.backlogInternalError(context);
}
