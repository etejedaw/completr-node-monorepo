import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gameScoreDomainError from "./game-scores.domain-error";

export function gameScoresServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_SCORE_NOT_FOUND")
		return gameScoreDomainError.gameScoreNotFound(context);

	if (error.code === "GAME_SCORE_UNIQUE_CONSTRAINT")
		return gameScoreDomainError.gameScoreAlreadyExists(context);

	return new DomainError(
		"GameScore Module",
		"GAME_SCORE_INTERNAL_ERROR",
		"Unexpected GameScore Service error",
		context
	);
}
