import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as rewindEditionsDomainError from "./rewind-editions.domain-error";

export function rewindEditionsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "REWIND_EDITION_NOT_FOUND")
		return rewindEditionsDomainError.editionNotFound(context);

	if (error.code === "REWIND_EDITION_EXISTS")
		return rewindEditionsDomainError.editionExists(context);

	if (error.code === "REWIND_EDITION_OVERLAP")
		return rewindEditionsDomainError.editionOverlap(context);

	if (error.code === "REWIND_EDITION_FROZEN")
		return rewindEditionsDomainError.editionFrozen(context);

	if (error.code === "REWIND_EDITION_INVALID")
		return rewindEditionsDomainError.editionInvalid(context);

	return rewindEditionsDomainError.rewindEditionsInternalError(context);
}
