import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "SavedFilter Service" };

export function notFoundError() {
	return new ServiceError("SAVED_FILTER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("SAVED_FILTER_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function limitReachedError() {
	return new ServiceError("SAVED_FILTER_LIMIT_REACHED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function frozenError() {
	return new ServiceError("SAVED_FILTER_FROZEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
