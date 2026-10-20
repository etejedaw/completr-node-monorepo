import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Mail Provider" };

export function sendError(rawError: unknown) {
	return new ServiceError("MAIL_SEND_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function disabledError() {
	return new ServiceError("MAIL_DISABLED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
