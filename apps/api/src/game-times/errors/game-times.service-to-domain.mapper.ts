import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gameTimeDomainError from "./game-times.domain-error";

export function gameTimesServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_TIME_NOT_FOUND")
		return gameTimeDomainError.gameTimeNotFound(context);

	if (error.code === "GAME_TIME_UNIQUE_CONSTRAINT")
		return gameTimeDomainError.gameTimeAlreadyExists(context);

	return new DomainError(
		"GameTime Module",
		"GAME_TIME_INTERNAL_ERROR",
		"Unexpected GameTime Service error",
		context
	);
}
