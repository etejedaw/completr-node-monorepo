import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Auth Module";

export function userAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_USER_ALREADY_EXISTS",
		"Username or email are already registered",
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

export function authForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_FORBIDDEN",
		"You do not have permission to access this resource",
		context
	);
}

export function invalidRefreshToken(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"AUTH_INVALID_REFRESH_TOKEN",
		"Invalid or expired refresh token",
		context
	);
}
