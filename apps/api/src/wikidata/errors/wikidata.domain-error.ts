import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Wikidata Provider";

export function wikidataParseError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_PARSE_ERROR",
		"Unexpected Wikidata response structure",
		context
	);
}

export function wikidataRateLimited(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_RATE_LIMITED",
		"Wikidata rate limit reached",
		context
	);
}

export function wikidataBlocked(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_BLOCKED",
		"Wikidata blocked the request",
		context
	);
}

export function wikidataTimeout(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_TIMEOUT",
		"Wikidata request timed out",
		context
	);
}

export function wikidataAborted(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_ABORTED",
		"Wikidata request was aborted",
		context
	);
}

export function wikidataRequestError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_REQUEST_ERROR",
		"Wikidata request failed",
		context
	);
}

export function wikidataInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"WIKIDATA_INTERNAL_ERROR",
		"Unexpected Wikidata Provider error",
		context
	);
}
