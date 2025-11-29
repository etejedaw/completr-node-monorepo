import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Platform Service" };

export function validationError(rawError: unknown) {
	return new ServiceError("PLATFORM_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("PLATFORM_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notFoundError() {
	return new ServiceError("PLATFORM_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
