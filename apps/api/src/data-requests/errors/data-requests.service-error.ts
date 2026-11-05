import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Data Requests Service" };

export function notFoundError() {
	return new ServiceError("DATA_REQUEST_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyPendingError(rawError?: unknown) {
	return new ServiceError("DATA_REQUEST_ALREADY_PENDING", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notPendingError() {
	return new ServiceError("DATA_REQUEST_NOT_PENDING", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function validationError(rawError: unknown) {
	return new ServiceError("DATA_REQUEST_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
