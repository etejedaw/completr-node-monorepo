import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "IGDB Provider";

export function igdbDisabled(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_DISABLED",
		"IGDB integration is disabled",
		context
	);
}

export function igdbNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_NOT_FOUND",
		"Game not found in IGDB",
		context
	);
}

export function igdbRateLimited(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_RATE_LIMITED",
		"IGDB rate limit reached",
		context
	);
}

export function igdbAuthError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_AUTH_ERROR",
		"IGDB rejected the credentials",
		context
	);
}

export function igdbRequestError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_REQUEST_ERROR",
		"IGDB request failed",
		context
	);
}

export function igdbParseError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_PARSE_ERROR",
		"Unexpected IGDB response",
		context
	);
}

export function igdbInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IGDB_INTERNAL_ERROR",
		"Unexpected IGDB Provider error",
		context
	);
}
