import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "GameTime Module";

export function gameTimeNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_TIME_NOT_FOUND",
		"Game time not found",
		context
	);
}

export function gameTimeAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_TIME_ALREADY_EXISTS",
		"A time for this game and source already exists",
		context
	);
}
