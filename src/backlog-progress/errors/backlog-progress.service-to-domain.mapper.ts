import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as backlogProgressDomainError from "./backlog-progress.domain-error";

export function backlogProgressServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND")
		return backlogProgressDomainError.backlogNotFound(context);

	if (error.code === "BACKLOG_PROGRESS_FORBIDDEN")
		return backlogProgressDomainError.forbidden(context);

	if (error.code === "BACKLOG_PROGRESS_NOTE_NOT_FOUND")
		return backlogProgressDomainError.noteNotFound(context);

	return backlogProgressDomainError.backlogProgressInternalError(context);
}
