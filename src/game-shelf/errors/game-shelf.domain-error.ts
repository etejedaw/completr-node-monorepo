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
