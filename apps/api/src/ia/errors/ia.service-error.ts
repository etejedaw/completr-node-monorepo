import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "IA Provider" };

export function notConfiguredError() {
	return new ServiceError("IA_NOT_CONFIGURED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function invalidInputError(reason: string) {
	return new ServiceError("IA_INVALID_INPUT", {
		...BASE_OPTIONS,
		raw: reason
	});
}

export function providerUnavailableError(rawError: unknown) {
	return new ServiceError("IA_PROVIDER_UNAVAILABLE", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function timeoutError(rawError: unknown) {
	return new ServiceError("IA_TIMEOUT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function invalidResponseError(rawError: unknown) {
	return new ServiceError("IA_INVALID_RESPONSE", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function invalidOutputError(rawError: unknown) {
	return new ServiceError("IA_INVALID_OUTPUT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
