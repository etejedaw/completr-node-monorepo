import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Playthrough Service" };

export function notFoundError() {
	return new ServiceError("PLAYTHROUGH_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("PLAYTHROUGH_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function validationError(rawError: unknown) {
	return new ServiceError("PLAYTHROUGH_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
