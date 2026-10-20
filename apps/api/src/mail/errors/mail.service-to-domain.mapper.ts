import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as mailDomainError from "./mail.domain-error";

export function mailServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "MAIL_DISABLED")
		return mailDomainError.mailDisabled(context);

	if (error.code === "MAIL_SEND_ERROR")
		return mailDomainError.mailSendError(context);

	return mailDomainError.mailInternalError(context);
}
