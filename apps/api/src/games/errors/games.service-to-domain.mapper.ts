import { type DomainError } from "../../common/errors/domain-error";
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

	if (error.code === "GAME_GENRE_NOT_FOUND")
		return gameDomainError.gameGenreNotFound(context);

	if (error.code === "GAME_UNIQUE_CONSTRAINT")
		return gameDomainError.gameUniqueConstraint(context);

	if (error.code === "GAME_VALIDATION_ERROR")
		return gameDomainError.gameValidation(context);

	if (error.code === "GAME_VARIANT_REQUIRED")
		return gameDomainError.gameVariantRequired(context);

	if (error.code === "GAME_SPLIT_INVALID")
		return gameDomainError.gameSplitInvalid(context);

	if (error.code === "GAME_COMPILATION_INVALID")
		return gameDomainError.gameCompilationInvalid(context);

	return gameDomainError.gameInternalError(context);
}
