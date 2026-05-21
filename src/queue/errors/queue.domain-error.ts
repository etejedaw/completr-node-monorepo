import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Queue Module";

export function queueBacklogNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_BACKLOG_NOT_FOUND",
		"Backlog entry not found",
		context
	);
}

export function queueBacklogNotOwned(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_BACKLOG_NOT_OWNED",
		"Backlog entry does not belong to you",
		context
	);
}

export function queueGameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function queuePlatformNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_PLATFORM_NOT_FOUND",
		"Platform not found",
		context
	);
}

export function queueAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_ALREADY_EXISTS",
		"This entry is already in your queue",
		context
	);
}

export function queueLimitReached(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_LIMIT_REACHED",
		"Queue limit reached for free plan",
		context
	);
}

export function queueBacklogsNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_BACKLOGS_NOT_FOUND",
		"One or more backlog entries not found",
		context
	);
}

export function queueSourceMismatch(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_SOURCE_MISMATCH",
		"Body field does not match source query param",
		context
	);
}

export function queueInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"QUEUE_INTERNAL_ERROR",
		"Unexpected Queue Service error",
		context
	);
}
