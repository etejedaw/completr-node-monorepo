import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Platform Module";

export function platformNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLATFORM_NOT_FOUND",
		"Platform not found",
		context
	);
}

export function platformValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLATFORM_VALIDATION_ERROR",
		"Platform validation failed",
		context
	);
}

export function platformUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLATFORM_UNIQUE_CONSTRAINT",
		"Platform already exists",
		context
	);
}

export function platformInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"PLATFORM_INTERNAL_ERROR",
		"Unexpected Platform Service error",
		context
	);
}
