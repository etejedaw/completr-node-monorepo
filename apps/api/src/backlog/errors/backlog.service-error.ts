import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Backlog Service" };

export function notFoundError() {
	return new ServiceError("BACKLOG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("BACKLOG_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function validationError(rawError: unknown) {
	return new ServiceError("BACKLOG_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("BACKLOG_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function compilationContextInvalidError() {
	return new ServiceError("BACKLOG_COMPILATION_CONTEXT_INVALID", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
