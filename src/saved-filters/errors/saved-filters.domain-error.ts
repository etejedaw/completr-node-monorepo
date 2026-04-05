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

export function savedFilterForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_FORBIDDEN",
		"You do not have permission to modify this saved filter",
		context
	);
}

export function savedFilterLimitReached(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"SAVED_FILTER_LIMIT_REACHED",
		"Free users can save up to 5 filters. Upgrade to premium for unlimited.",
		context
	);
}
