import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Game Module";

export function gameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function gamePlatformNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATFORM_NOT_FOUND",
		"One or more platforms not found",
		context
	);
}

export function gameGenreNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_GENRE_NOT_FOUND",
		"One or more genres not found",
		context
	);
}

export function gameValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_VALIDATION_ERROR",
		"Game validation failed",
		context
	);
}

export function gameUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_UNIQUE_CONSTRAINT",
		"Game already exists",
		context
	);
}

export function gameForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_FORBIDDEN",
		"You do not have permission to perform this action",
		context
	);
}

export function gameInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_INTERNAL_ERROR",
		"Unexpected Games Service error",
		context
	);
}
