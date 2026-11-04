import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "IGDB Provider" };

export function notFoundError() {
	return new ServiceError("IGDB_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function requestError(rawError: unknown) {
	return new ServiceError("IGDB_REQUEST_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function rateLimitedError() {
	return new ServiceError("IGDB_RATE_LIMITED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function parseError(rawError: unknown) {
	return new ServiceError("IGDB_PARSE_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function disabledError() {
	return new ServiceError("IGDB_DISABLED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function authError(rawError: unknown) {
	return new ServiceError("IGDB_AUTH_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
