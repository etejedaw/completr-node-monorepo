import { ServiceError } from "../../common/errors/service-error";
import { ScrapingRequestError } from "../../scraping/errors/scraping-request.error";

const BASE_OPTIONS = { service: "Wikidata Provider" };

export function parseError(rawError: unknown) {
	return new ServiceError("WIKIDATA_PARSE_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function rateLimitedError(rawError: unknown) {
	return new ServiceError("WIKIDATA_RATE_LIMITED", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function blockedError(rawError: unknown) {
	return new ServiceError("WIKIDATA_BLOCKED", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function timeoutError(rawError: unknown) {
	return new ServiceError("WIKIDATA_TIMEOUT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function requestError(rawError: unknown) {
	return new ServiceError("WIKIDATA_REQUEST_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function fromRequestFailure(error: unknown) {
	if (!(error instanceof ScrapingRequestError)) return requestError(error);

	const raw = { ...error.detail, kind: error.kind };

	if (error.kind === "RATE_LIMITED") return rateLimitedError(raw);
	if (error.kind === "BLOCKED") return blockedError(raw);
	if (error.kind === "TIMEOUT") return timeoutError(raw);
	return requestError(raw);
}
