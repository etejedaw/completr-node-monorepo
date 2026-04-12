import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Game External Module";

export function notFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_EXTERNAL_NOT_FOUND",
		"External ID not found",
		context
	);
}

export function alreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_EXTERNAL_ALREADY_EXISTS",
		"External ID already exists for this game and source",
		context
	);
}
