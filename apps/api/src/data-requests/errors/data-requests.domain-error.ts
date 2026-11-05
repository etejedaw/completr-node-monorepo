import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Data Request Module";

export function dataRequestNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_NOT_FOUND",
		"Data request not found",
		context
	);
}

export function dataRequestAlreadyPending(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_ALREADY_PENDING",
		"There is already a pending request of this type",
		context
	);
}

export function dataRequestNotPending(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_NOT_PENDING",
		"This data request has already been resolved",
		context
	);
}

export function dataRequestNotDownloadable(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_NOT_DOWNLOADABLE",
		"This data request has no download available",
		context
	);
}

export function dataRequestExpired(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_EXPIRED",
		"The download window of this data request has ended",
		context
	);
}

export function dataRequestValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_VALIDATION_ERROR",
		"Invalid data request",
		context
	);
}

export function dataRequestInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"DATA_REQUEST_INTERNAL_ERROR",
		"Unexpected Data Requests Service error",
		context
	);
}
