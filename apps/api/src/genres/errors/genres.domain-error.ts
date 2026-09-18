import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Genre Module";

export function genreNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GENRE_NOT_FOUND",
		"Genre not found",
		context
	);
}

export function genreValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GENRE_VALIDATION_ERROR",
		"Genre validation failed",
		context
	);
}

export function genreUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GENRE_UNIQUE_CONSTRAINT",
		"Genre already exists",
		context
	);
}

export function genreInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GENRE_INTERNAL_ERROR",
		"Unexpected Genre Service error",
		context
	);
}
