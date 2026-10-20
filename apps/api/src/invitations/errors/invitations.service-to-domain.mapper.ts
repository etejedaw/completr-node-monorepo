import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as invitationsDomainError from "./invitations.domain-error";

export function invitationsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "INVITATION_UNIQUE_CONSTRAINT")
		return invitationsDomainError.invitationUniqueConstraint(context);

	if (error.code === "INVITATION_VALIDATION_ERROR")
		return invitationsDomainError.invitationValidationError(context);

	return invitationsDomainError.invitationInternalError(context);
}
