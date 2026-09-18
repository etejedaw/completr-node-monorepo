import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as rawgDomainError from "./rawg.domain-error";

export function rawgServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "RAWG_DISABLED")
		return rawgDomainError.rawgDisabled(context);

	if (error.code === "RAWG_NOT_FOUND")
		return rawgDomainError.rawgNotFound(context);

	if (error.code === "RAWG_RATE_LIMITED")
		return rawgDomainError.rawgRateLimited(context);

	if (error.code === "RAWG_REQUEST_ERROR")
		return rawgDomainError.rawgRequestError(context);

	if (error.code === "RAWG_PARSE_ERROR")
		return rawgDomainError.rawgParseError(context);

	return rawgDomainError.rawgInternalError(context);
}
