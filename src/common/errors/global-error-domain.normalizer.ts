import { authErrorDomainNormalizer } from "../../auth/errors/auth.error-domain.normalizer";
import { usersErrorDomainNormalizer } from "../../users/errors/users.error-domain.normalizer";
import { gamesErrorDomainNormalizer } from "../../games/errors/games.error-domain.normalizer";
import { platformsErrorDomainNormalizer } from "../../platforms/errors/platforms.error-domain.normalizer";
import { genresErrorDomainNormalizer } from "../../genres/errors/genres.error-domain.normalizer";
import { gameShelfErrorDomainNormalizer } from "../../game-shelf/errors/game-shelf.error-domain.normalizer";
import { DomainError } from "./domain-error";
import { ServiceError } from "./service-error";

export function globalErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;

	if (error instanceof ServiceError)
		return globalServiceErrorMapper(error, correlationId);

	return new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error", {
		raw: error,
		correlationId
	});
}

function globalServiceErrorMapper(
	error: ServiceError,
	correlationId: string
): DomainError {
	if (error.serviceError.service === "Users Service")
		return usersErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Auth Service")
		return authErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Games Service")
		return gamesErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Platform Service")
		return platformsErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "Genre Service")
		return genresErrorDomainNormalizer(error, correlationId);

	if (error.serviceError.service === "GameShelf Service")
		return gameShelfErrorDomainNormalizer(error, correlationId);

	return new DomainError("COMMON", "INTERNAL_ERROR", "Unexpected error", {
		raw: error,
		correlationId
	});
}
