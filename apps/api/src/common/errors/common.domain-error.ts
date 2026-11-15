import { DomainError } from "./domain-error";
import { type ValidationIssue } from "./errors.interface";

const MODULE_NAME = "Common Module";
const INTERNAL_ERROR_MODULE_NAME = "COMMON";

export function commonResourceInUse(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COMMON_RESOURCE_IN_USE",
		"Resource is referenced by other records",
		context
	);
}

export function commonReferenceNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COMMON_REFERENCE_NOT_FOUND",
		"Referenced resource does not exist",
		context
	);
}

export function exportFormatPremium(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"EXPORT_FORMAT_PREMIUM",
		"Export format requires a premium account",
		context
	);
}

export function exportFormatNotAcceptable(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"EXPORT_FORMAT_NOT_ACCEPTABLE",
		"Export is only available as text/csv or application/json",
		context
	);
}

export function commonInvalidJson(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COMMON_INVALID_JSON",
		"Request body is not valid JSON",
		context
	);
}

export function commonPayloadTooLarge(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COMMON_PAYLOAD_TOO_LARGE",
		"Request body is too large",
		context
	);
}

export function commonInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		INTERNAL_ERROR_MODULE_NAME,
		"INTERNAL_ERROR",
		"Unexpected internal error",
		context
	);
}

export function commonSchemaInvalid(
	context: Record<string, unknown>,
	issues: ValidationIssue[]
) {
	return new DomainError(
		MODULE_NAME,
		"COMMON_SCHEMA_INVALID",
		"Invalid request schema",
		context,
		issues
	);
}

export function commonSourceUnavailable(
	message: string,
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"COMMON_SOURCE_UNAVAILABLE",
		message,
		context
	);
}
