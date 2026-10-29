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

export function rewindNotGenerated(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_NOT_GENERATED",
		"This Rewind has not been generated yet",
		context
	);
}

export function rewindGenerationConflict(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_GENERATION_CONFLICT",
		"This Rewind changed since you last loaded it",
		context
	);
}

export function rewindRegenerationLimit(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_REGENERATION_LIMIT",
		"No regenerations left for this Rewind",
		context
	);
}

export function rewindAiRecapPremiumRequired(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_AI_RECAP_PREMIUM_REQUIRED",
		"The AI recap requires a premium account",
		context
	);
}

export function rewindAiRecapExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_AI_RECAP_EXISTS",
		"This Rewind already has an AI recap",
		context
	);
}

export function rewindAiRecapInProgress(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_AI_RECAP_IN_PROGRESS",
		"The AI recap is still being generated",
		context
	);
}

export function rewindAiRecapFailed(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_AI_RECAP_FAILED",
		"The AI recap could not be generated",
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
