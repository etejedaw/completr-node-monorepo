import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "GameScore Module";

export function gameScoreNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SCORE_NOT_FOUND",
		"Game score not found",
		context
	);
}

export function gameScoreAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"GAME_SCORE_ALREADY_EXISTS",
		"A score for this game and source already exists",
		context
	);
}
