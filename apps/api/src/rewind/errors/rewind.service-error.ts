import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Rewind Service" };

export function notFoundError() {
	return new ServiceError("REWIND_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function userNotFoundError() {
	return new ServiceError("USER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function userPrivateError() {
	return new ServiceError("USER_PRIVATE", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
