import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as iaDomainError from "./ia.domain-error";

export function iaServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "IA_NOT_CONFIGURED")
		return iaDomainError.iaNotConfigured(context);

	if (error.code === "IA_INVALID_INPUT")
		return iaDomainError.iaInvalidInput(context);

	if (error.code === "IA_PROVIDER_UNAVAILABLE")
		return iaDomainError.iaProviderUnavailable(context);

	if (error.code === "IA_TIMEOUT") return iaDomainError.iaTimeout(context);

	if (error.code === "IA_INVALID_RESPONSE")
		return iaDomainError.iaInvalidResponse(context);

	return iaDomainError.iaInternalError(context);
}
