import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gamePlatinumDomainError from "./game-platinum.domain-error";

export function gamePlatinumServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_PLATINUM_GAME_NOT_FOUND")
		return gamePlatinumDomainError.gameNotFound(context);

	if (error.code === "GAME_PLATINUM_NOT_FOUND")
		return gamePlatinumDomainError.platinumNotFound(context);

	if (error.code === "GAME_PLATINUM_BACKLOG_NOT_FOUND")
		return gamePlatinumDomainError.backlogNotFound(context);

	if (error.code === "GAME_PLATINUM_BACKLOG_GAME_MISMATCH")
		return gamePlatinumDomainError.backlogGameMismatch(context);

	if (error.code === "GAME_PLATINUM_PLATFORM_NOT_FOUND")
		return gamePlatinumDomainError.platformNotFound(context);

	if (error.code === "GAME_PLATINUM_UNIQUE_CONSTRAINT")
		return gamePlatinumDomainError.uniqueConstraint(context);

	if (error.code === "GAME_PLATINUM_VALIDATION_ERROR")
		return gamePlatinumDomainError.validationError(context);

	return gamePlatinumDomainError.gamePlatinumInternalError(context);
}
