import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Invitation Module";

export function invitationNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"INVITATION_NOT_FOUND",
		"Invitation not found",
		context
	);
}

export function invitationInvalidToken(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"INVITATION_INVALID_TOKEN",
		"Invalid or expired invitation",
		context
	);
}

export function invitationEmailRegistered(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"INVITATION_EMAIL_REGISTERED",
		"This email already has an account",
		context
	);
}

export function invitationUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"INVITATION_UNIQUE_CONSTRAINT",
		"An invitation for this email is already being created",
		context
	);
}

export function invitationValidationError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"INVITATION_VALIDATION_ERROR",
		"Invalid invitation data",
		context
	);
}

export function invitationInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"INVITATION_INTERNAL_ERROR",
		"Unexpected Invitation Service error",
		context
	);
}
