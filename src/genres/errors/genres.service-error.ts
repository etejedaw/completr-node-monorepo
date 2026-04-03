import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Genre Service" };

export function validationError(rawError: unknown) {
	return new ServiceError("GENRE_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("GENRE_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notFoundError() {
	return new ServiceError("GENRE_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
