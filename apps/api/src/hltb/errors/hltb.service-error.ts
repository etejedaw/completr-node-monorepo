import { ServiceError } from "../../common/errors/service-error";
import { ScrapingRequestError } from "../../scraping/errors/scraping-request.error";

const BASE_OPTIONS = { service: "HLTB Provider" };

export function notFoundError(rawError?: unknown) {
	return new ServiceError("HLTB_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function parseError(rawError: unknown) {
	return new ServiceError("HLTB_PARSE_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function rateLimitedError(rawError: unknown) {
	return new ServiceError("HLTB_RATE_LIMITED", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function blockedError(rawError: unknown) {
	return new ServiceError("HLTB_BLOCKED", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function timeoutError(rawError: unknown) {
	return new ServiceError("HLTB_TIMEOUT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function requestError(rawError: unknown) {
	return new ServiceError("HLTB_REQUEST_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function abortedError(rawError: unknown) {
	return new ServiceError("HLTB_ABORTED", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function fromRequestFailure(error: unknown) {
	if (!(error instanceof ScrapingRequestError)) return requestError(error);

	const raw = { ...error.detail, kind: error.kind };

	if (error.kind === "NOT_FOUND") return notFoundError(raw);
	if (error.kind === "RATE_LIMITED") return rateLimitedError(raw);
	if (error.kind === "BLOCKED") return blockedError(raw);
	if (error.kind === "TIMEOUT") return timeoutError(raw);
	if (error.kind === "ABORTED") return abortedError(raw);
	return requestError(raw);
}
