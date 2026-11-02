import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as hltbDomainError from "./hltb.domain-error";

export function hltbServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "HLTB_NOT_FOUND")
		return hltbDomainError.hltbNotFound(context);

	if (error.code === "HLTB_PARSE_ERROR")
		return hltbDomainError.hltbParseError(context);

	if (error.code === "HLTB_RATE_LIMITED")
		return hltbDomainError.hltbRateLimited(context);

	if (error.code === "HLTB_BLOCKED")
		return hltbDomainError.hltbBlocked(context);

	if (error.code === "HLTB_TIMEOUT")
		return hltbDomainError.hltbTimeout(context);

	if (error.code === "HLTB_ABORTED")
		return hltbDomainError.hltbAborted(context);

	if (error.code === "HLTB_REQUEST_ERROR")
		return hltbDomainError.hltbRequestError(context);

	return hltbDomainError.hltbInternalError(context);
}
