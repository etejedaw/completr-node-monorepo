import { DomainError } from "./domain-error";

const MODULE_NAME = "Common Module";

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
