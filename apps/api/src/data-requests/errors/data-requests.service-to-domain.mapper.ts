import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as dataRequestsDomainError from "./data-requests.domain-error";

export function dataRequestsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "DATA_REQUEST_NOT_FOUND")
		return dataRequestsDomainError.dataRequestNotFound(context);

	if (error.code === "DATA_REQUEST_ALREADY_PENDING")
		return dataRequestsDomainError.dataRequestAlreadyPending(context);

	if (error.code === "DATA_REQUEST_NOT_PENDING")
		return dataRequestsDomainError.dataRequestNotPending(context);

	if (error.code === "DATA_REQUEST_VALIDATION_ERROR")
		return dataRequestsDomainError.dataRequestValidation(context);

	return dataRequestsDomainError.dataRequestInternalError(context);
}
