import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Franchise Module";

export function franchiseNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FRANCHISE_NOT_FOUND",
		"Franchise not found",
		context
	);
}

export function franchiseValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FRANCHISE_VALIDATION_ERROR",
		"Franchise validation failed",
		context
	);
}

export function franchiseUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FRANCHISE_UNIQUE_CONSTRAINT",
		"Franchise already exists",
		context
	);
}

export function franchiseInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"FRANCHISE_INTERNAL_ERROR",
		"Unexpected Franchise Service error",
		context
	);
}
