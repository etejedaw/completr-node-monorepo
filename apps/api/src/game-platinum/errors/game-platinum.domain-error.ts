import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "GamePlatinum Module";

export function gameNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_GAME_NOT_FOUND",
		"Game not found",
		context
	);
}

export function platinumNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_NOT_FOUND",
		"Platinum not found for this game",
		context
	);
}

export function backlogNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_BACKLOG_NOT_FOUND",
		"Backlog entry not found",
		context
	);
}

export function backlogGameMismatch(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_BACKLOG_GAME_MISMATCH",
		"Backlog entry belongs to another game",
		context
	);
}

export function platformNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_PLATFORM_NOT_FOUND",
		"Platform not found",
		context
	);
}

export function uniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_UNIQUE_CONSTRAINT",
		"Platinum already exists for this game",
		context
	);
}

export function validationError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_VALIDATION_ERROR",
		"Platinum validation error",
		context
	);
}

export function gamePlatinumInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_PLATINUM_INTERNAL_ERROR",
		"Unexpected GamePlatinum Service error",
		context
	);
}
