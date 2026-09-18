import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gameShelfDomainError from "./game-shelf.domain-error";

export function gameShelfServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_SHELF_NOT_FOUND")
		return gameShelfDomainError.gameShelfNotFound(context);

	if (error.code === "GAME_SHELF_FORBIDDEN")
		return gameShelfDomainError.gameShelfForbidden(context);

	if (error.code === "GAME_SHELF_UNIQUE_CONSTRAINT")
		return gameShelfDomainError.gameShelfUniqueConstraint(context);

	if (error.code === "GAME_SHELF_VALIDATION_ERROR")
		return gameShelfDomainError.gameShelfValidation(context);

	return gameShelfDomainError.gameShelfInternalError(context);
}
