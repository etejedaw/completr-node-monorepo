import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as wikidataDomainError from "./wikidata.domain-error";

export function wikidataServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "WIKIDATA_PARSE_ERROR")
		return wikidataDomainError.wikidataParseError(context);

	if (error.code === "WIKIDATA_RATE_LIMITED")
		return wikidataDomainError.wikidataRateLimited(context);

	if (error.code === "WIKIDATA_BLOCKED")
		return wikidataDomainError.wikidataBlocked(context);

	if (error.code === "WIKIDATA_TIMEOUT")
		return wikidataDomainError.wikidataTimeout(context);

	if (error.code === "WIKIDATA_REQUEST_ERROR")
		return wikidataDomainError.wikidataRequestError(context);

	return wikidataDomainError.wikidataInternalError(context);
}
