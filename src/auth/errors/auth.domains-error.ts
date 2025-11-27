import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Auth Module";

export function userAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_USER_ALREADY_EXISTS",
		"User or email are already registered",
		context
	);
}

export function invalidCredentials(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_INVALID_CREDENTIALS",
		"Invalid email or password",
		context
	);
}

export function authInvalidToken(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_INVALID_TOKEN",
		"Invalid Token",
		context
	);
}

export function authRateLimited(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_RATE_LIMITED",
		"Too many requests",
		context
	);
}

export function authSchemaInvalid(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_SCHEMA_INVALID",
		"Missing Token",
		context
	);
}
