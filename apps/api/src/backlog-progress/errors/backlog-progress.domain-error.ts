import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "BacklogProgress Module";

export function backlogNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_PROGRESS_BACKLOG_NOT_FOUND",
		"Backlog not found",
		context
	);
}

export function noteNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_PROGRESS_NOTE_NOT_FOUND",
		"Progress note not found",
		context
	);
}

export function backlogProgressInternalError(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"BACKLOG_PROGRESS_INTERNAL_ERROR",
		"Unexpected BacklogProgress Service error",
		context
	);
}
