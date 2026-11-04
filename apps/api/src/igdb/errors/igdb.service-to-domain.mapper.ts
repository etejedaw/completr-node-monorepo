import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as igdbDomainError from "./igdb.domain-error";

export function igdbServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "IGDB_DISABLED")
		return igdbDomainError.igdbDisabled(context);

	if (error.code === "IGDB_NOT_FOUND")
		return igdbDomainError.igdbNotFound(context);

	if (error.code === "IGDB_RATE_LIMITED")
		return igdbDomainError.igdbRateLimited(context);

	if (error.code === "IGDB_AUTH_ERROR")
		return igdbDomainError.igdbAuthError(context);

	if (error.code === "IGDB_REQUEST_ERROR")
		return igdbDomainError.igdbRequestError(context);

	if (error.code === "IGDB_PARSE_ERROR")
		return igdbDomainError.igdbParseError(context);

	return igdbDomainError.igdbInternalError(context);
}
