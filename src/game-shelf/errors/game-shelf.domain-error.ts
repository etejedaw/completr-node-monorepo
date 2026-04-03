import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "GameShelf Module";

export function gameShelfNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SHELF_NOT_FOUND",
		"Game shelf entry not found",
		context
	);
}

export function gameShelfForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SHELF_FORBIDDEN",
		"You do not have permission to modify this game shelf entry",
		context
	);
}

export function gameShelfValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SHELF_VALIDATION_ERROR",
		"Game shelf validation failed",
		context
	);
}

export function gameShelfUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SHELF_UNIQUE_CONSTRAINT",
		"Game shelf entry already exists",
		context
	);
}

export function gameShelfInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SHELF_INTERNAL_ERROR",
		"Unexpected GameShelf Service error",
		context
	);
}
