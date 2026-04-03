import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gameDomainError from "./games.domain-error";

export function gamesServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_NOT_FOUND")
		return gameDomainError.gameNotFound(context);

	if (error.code === "GAME_PLATFORM_NOT_FOUND")
		return gameDomainError.gamePlatformNotFound(context);

	if (error.code === "GAME_UNIQUE_CONSTRAINT")
		return gameDomainError.gameUniqueConstraint(context);

	if (error.code === "GAME_VALIDATION_ERROR")
		return gameDomainError.gameValidation(context);

	return gameDomainError.gameInternalError(context);
}
