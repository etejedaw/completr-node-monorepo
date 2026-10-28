import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "IA Provider";

export function iaNotConfigured(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IA_NOT_CONFIGURED",
		"AI features are not configured",
		context
	);
}

export function iaInvalidInput(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IA_INVALID_INPUT",
		"Invalid AI generation request",
		context
	);
}

export function iaProviderUnavailable(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IA_PROVIDER_UNAVAILABLE",
		"AI provider is unavailable",
		context
	);
}

export function iaTimeout(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IA_TIMEOUT",
		"AI provider timed out",
		context
	);
}

export function iaInvalidResponse(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IA_INVALID_RESPONSE",
		"Unexpected AI provider response",
		context
	);
}

export function iaInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"IA_INTERNAL_ERROR",
		"Unexpected IA Provider error",
		context
	);
}
