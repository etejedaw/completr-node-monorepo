import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "List Service" };

export function validationError(rawError: unknown) {
	return new ServiceError("LIST_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("LIST_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notFoundError() {
	return new ServiceError("LIST_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("LIST_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function limitReachedError() {
	return new ServiceError("LIST_LIMIT_REACHED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function frozenError() {
	return new ServiceError("LIST_FROZEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
