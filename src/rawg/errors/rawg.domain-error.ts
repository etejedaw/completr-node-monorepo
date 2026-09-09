import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "RAWG Provider";

export function rawgDisabled(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"RAWG_DISABLED",
		"RAWG integration is disabled",
		context
	);
}

export function rawgNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"RAWG_NOT_FOUND",
		"Game not found in RAWG",
		context
	);
}

export function rawgRateLimited(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"RAWG_RATE_LIMITED",
		"RAWG rate limit reached",
		context
	);
}

export function rawgRequestError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"RAWG_REQUEST_ERROR",
		"RAWG request failed",
		context
	);
}

export function rawgParseError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"RAWG_PARSE_ERROR",
		"Unexpected RAWG response",
		context
	);
}

export function rawgInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"RAWG_INTERNAL_ERROR",
		"Unexpected RAWG Provider error",
		context
	);
}
