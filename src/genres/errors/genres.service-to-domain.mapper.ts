import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as genreDomainError from "./genres.domain-error";

export function genresServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "GENRE_NOT_FOUND")
		return genreDomainError.genreNotFound(context);

	if (error.code === "GENRE_UNIQUE_CONSTRAINT")
		return genreDomainError.genreUniqueConstraint(context);

	if (error.code === "GENRE_VALIDATION_ERROR")
		return genreDomainError.genreValidation(context);

	return genreDomainError.genreInternalError(context);
}
