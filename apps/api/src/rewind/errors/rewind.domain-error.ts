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

export function rewindPeriodClosed(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_PERIOD_CLOSED",
		"The Rewind period is closed",
		context
	);
}

export function rewindYearRequiresPremium(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_YEAR_REQUIRES_PREMIUM",
		"Generating the Rewind of a previous year requires a premium account",
		context
	);
}

export function rewindNoAiAccess(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_NO_AI_ACCESS",
		"The owner of this Rewind has no access to the AI",
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

export function rewindAiRecapDailyLimit(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_AI_RECAP_DAILY_LIMIT",
		"You reached today's AI recap limit, try again tomorrow",
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
