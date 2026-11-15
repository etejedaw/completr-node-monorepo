import { type DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as authDomainError from "./auth.domain-error";

export function authServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "AUTH_USER_ALREADY_EXISTS")
		return authDomainError.userAlreadyExists(context);

	if (error.code === "AUTH_INVALID_CREDENTIALS")
		return authDomainError.invalidCredentials(context);

	if (error.code === "AUTH_INVALID_TOKEN")
		return authDomainError.authInvalidToken(context);

	if (error.code === "AUTH_INVALID_CURRENT_PASSWORD")
		return authDomainError.invalidCurrentPassword(context);

	if (error.code === "AUTH_INVALID_REFRESH_TOKEN")
		return authDomainError.invalidRefreshToken(context);

	if (error.code === "AUTH_INVALID_PASSWORD_RESET_TOKEN")
		return authDomainError.invalidPasswordResetToken(context);

	return authDomainError.authInternalError(context);
}
