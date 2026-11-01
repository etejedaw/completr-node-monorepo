import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Metacritic Provider";

export function metacriticNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_NOT_FOUND",
		"Game not found in Metacritic",
		context
	);
}

export function metacriticParseError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_PARSE_ERROR",
		"Unexpected Metacritic page structure",
		context
	);
}

export function metacriticRateLimited(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_RATE_LIMITED",
		"Metacritic rate limit reached",
		context
	);
}

export function metacriticBlocked(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_BLOCKED",
		"Metacritic blocked the request",
		context
	);
}

export function metacriticTimeout(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_TIMEOUT",
		"Metacritic request timed out",
		context
	);
}

export function metacriticRequestError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_REQUEST_ERROR",
		"Metacritic request failed",
		context
	);
}

export function metacriticInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"METACRITIC_INTERNAL_ERROR",
		"Unexpected Metacritic Provider error",
		context
	);
}
