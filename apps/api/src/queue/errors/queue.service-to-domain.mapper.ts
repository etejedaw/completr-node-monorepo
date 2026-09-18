import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as queueDomainError from "./queue.domain-error";

export function queueServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "QUEUE_BACKLOG_NOT_FOUND")
		return queueDomainError.queueBacklogNotFound(context);

	if (error.code === "QUEUE_BACKLOG_NOT_OWNED")
		return queueDomainError.queueBacklogNotOwned(context);

	if (error.code === "QUEUE_GAME_NOT_FOUND")
		return queueDomainError.queueGameNotFound(context);

	if (error.code === "QUEUE_PLATFORM_NOT_FOUND")
		return queueDomainError.queuePlatformNotFound(context);

	if (error.code === "QUEUE_ALREADY_EXISTS")
		return queueDomainError.queueAlreadyExists(context);

	if (error.code === "QUEUE_LIMIT_REACHED")
		return queueDomainError.queueLimitReached(context);

	if (error.code === "QUEUE_BACKLOGS_NOT_FOUND")
		return queueDomainError.queueBacklogsNotFound(context);

	if (
		error.code === "QUEUE_SOURCE_GAME_MISMATCH" ||
		error.code === "QUEUE_SOURCE_BACKLOG_MISMATCH"
	)
		return queueDomainError.queueSourceMismatch(context);

	if (error.code === "QUEUE_BACKLOG_NOT_STARTED")
		return queueDomainError.queueBacklogNotStarted(context);

	return queueDomainError.queueInternalError(context);
}
