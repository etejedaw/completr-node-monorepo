import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = {
	service: "Users Service"
};

export function notFoundError() {
	return new ServiceError("USER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function validationError(rawError: unknown) {
	return new ServiceError("USER_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("USER_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
