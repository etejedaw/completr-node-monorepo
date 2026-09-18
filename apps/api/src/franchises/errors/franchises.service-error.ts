import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Franchise Service" };

export function validationError(rawError: unknown) {
	return new ServiceError("FRANCHISE_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("FRANCHISE_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notFoundError() {
	return new ServiceError("FRANCHISE_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
