import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "List Module";

export function listNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_NOT_FOUND",
		"List not found",
		context
	);
}

export function listForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FORBIDDEN",
		"You do not have permission to modify this list",
		context
	);
}

export function listValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_VALIDATION_ERROR",
		"List validation failed",
		context
	);
}

export function listUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_UNIQUE_CONSTRAINT",
		"List already exists",
		context
	);
}

export function listLimitReached(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_LIMIT_REACHED",
		"Free users can create up to 5 lists. Upgrade to premium for unlimited.",
		context
	);
}

export function listFrozen(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FROZEN",
		"This list is frozen. Delete lists until you have 5 or less, or upgrade to premium.",
		context
	);
}

export function listInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_INTERNAL_ERROR",
		"Unexpected List Service error",
		context
	);
}
