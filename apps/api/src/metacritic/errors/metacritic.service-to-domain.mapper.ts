import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as metacriticDomainError from "./metacritic.domain-error";

export function metacriticServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "METACRITIC_NOT_FOUND")
		return metacriticDomainError.metacriticNotFound(context);

	if (error.code === "METACRITIC_PARSE_ERROR")
		return metacriticDomainError.metacriticParseError(context);

	if (error.code === "METACRITIC_RATE_LIMITED")
		return metacriticDomainError.metacriticRateLimited(context);

	if (error.code === "METACRITIC_BLOCKED")
		return metacriticDomainError.metacriticBlocked(context);

	if (error.code === "METACRITIC_TIMEOUT")
		return metacriticDomainError.metacriticTimeout(context);

	if (error.code === "METACRITIC_REQUEST_ERROR")
		return metacriticDomainError.metacriticRequestError(context);

	return metacriticDomainError.metacriticInternalError(context);
}
