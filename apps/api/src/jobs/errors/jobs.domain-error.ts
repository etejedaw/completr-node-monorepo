import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Jobs Module";

export function jobNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"JOB_NOT_FOUND",
		"Job not found or not running",
		context
	);
}

export function jobInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"JOB_INTERNAL_ERROR",
		"Unexpected Jobs Service error",
		context
	);
}
