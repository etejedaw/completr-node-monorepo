import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as rewindDomainError from "./rewind.domain-error";

export function rewindServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "REWIND_NOT_FOUND")
		return rewindDomainError.rewindNotFound(context);

	if (error.code === "USER_NOT_FOUND")
		return rewindDomainError.userNotFound(context);

	if (error.code === "USER_PRIVATE")
		return rewindDomainError.userPrivate(context);

	return rewindDomainError.rewindInternalError(context);
}
