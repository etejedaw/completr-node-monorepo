import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Mail Provider";

export function mailDisabled(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MAIL_DISABLED",
		"Email delivery is disabled",
		context
	);
}

export function mailSendError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MAIL_SEND_ERROR",
		"Email could not be sent",
		context
	);
}

export function mailInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"MAIL_INTERNAL_ERROR",
		"Unexpected Mail Provider error",
		context
	);
}
