import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Playthrough Module";

export function playthroughNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLAYTHROUGH_NOT_FOUND",
		"Playthrough not found",
		context
	);
}

export function playthroughForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLAYTHROUGH_FORBIDDEN",
		"You do not have permission to modify this playthrough",
		context
	);
}

export function playthroughValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLAYTHROUGH_VALIDATION_ERROR",
		"Playthrough validation failed",
		context
	);
}

export function playthroughInternalError(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"PLAYTHROUGH_INTERNAL_ERROR",
		"Unexpected Playthrough Service error",
		context
	);
}
