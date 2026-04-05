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

export function listInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_INTERNAL_ERROR",
		"Unexpected List Service error",
		context
	);
}
