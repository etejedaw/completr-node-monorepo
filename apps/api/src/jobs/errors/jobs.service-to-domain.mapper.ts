import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as jobsDomainError from "./jobs.domain-error";

export function jobsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "JOB_NOT_FOUND")
		return jobsDomainError.jobNotFound(context);

	return jobsDomainError.jobInternalError(context);
}
