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
