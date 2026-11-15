import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "SavedFilter Module";

export function savedFilterNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_NOT_FOUND",
		"Saved filter not found",
		context
	);
}

export function savedFilterLimitReached(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_LIMIT_REACHED",
		"Free users can save up to 5 filters. Upgrade to premium for unlimited.",
		context
	);
}

export function savedFilterFrozen(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_FROZEN",
		"This filter is frozen. Delete filters until you have 5 or less, or upgrade to premium.",
		context
	);
}

export function savedFilterAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_UNIQUE_CONSTRAINT",
		"This saved filter already exists",
		context
	);
}

export function savedFilterValidationError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_VALIDATION_ERROR",
		"The stored filters are not valid",
		context
	);
}
