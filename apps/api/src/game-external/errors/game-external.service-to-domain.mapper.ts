import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as gameExternalDomainError from "./game-external.domain-error";

export function gameExternalServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GAME_EXTERNAL_NOT_FOUND")
		return gameExternalDomainError.notFound(context);

	if (error.code === "GAME_EXTERNAL_UNIQUE_CONSTRAINT")
		return gameExternalDomainError.alreadyExists(context);

	return gameExternalDomainError.internalError(context);
}
