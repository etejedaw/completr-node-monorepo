import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Review Module";

export function reviewNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REVIEW_NOT_FOUND",
		"Review not found",
		context
	);
}

export function reviewForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REVIEW_FORBIDDEN",
		"Cannot modify another user's review",
		context
	);
}

export function reviewAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REVIEW_ALREADY_EXISTS",
		"You already reviewed this game",
		context
	);
}

export function gameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REVIEW_GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function reviewInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REVIEW_INTERNAL_ERROR",
		"Unexpected Review Service error",
		context
	);
}
