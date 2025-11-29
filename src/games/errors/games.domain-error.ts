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
