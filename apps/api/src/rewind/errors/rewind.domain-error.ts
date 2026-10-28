import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Rewind Module";

export function rewindNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_NOT_FOUND",
		"Rewind not found",
		context
	);
}

export function userNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_NOT_FOUND",
		"User not found",
		context
	);
}

export function userPrivate(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_PRIVATE",
		"This account is private",
		context
	);
}

export function rewindInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_INTERNAL_ERROR",
		"Unexpected Rewind Service error",
		context
	);
}
