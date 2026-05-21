import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Backlog Module";

export function backlogNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_NOT_FOUND",
		"Backlog entry not found",
		context
	);
}

export function backlogForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_FORBIDDEN",
		"You do not have permission to modify this backlog entry",
		context
	);
}

export function backlogValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_VALIDATION_ERROR",
		"Backlog validation failed",
		context
	);
}

export function backlogCompilationContextInvalid(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_COMPILATION_CONTEXT_INVALID",
		"Compilation context is invalid",
		context
	);
}

export function backlogInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_INTERNAL_ERROR",
		"Unexpected Backlog Service error",
		context
	);
}
