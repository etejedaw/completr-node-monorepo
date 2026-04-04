import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "RAWG Provider" };

export function notFoundError() {
	return new ServiceError("RAWG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function requestError(rawError: unknown) {
	return new ServiceError("RAWG_REQUEST_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function rateLimitedError() {
	return new ServiceError("RAWG_RATE_LIMITED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function parseError(rawError: unknown) {
	return new ServiceError("RAWG_PARSE_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
