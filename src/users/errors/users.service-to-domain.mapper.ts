import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as userDomainError from "./users.domain-error";

export function usersServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "USER_UNIQUE_CONSTRAINT")
		return userDomainError.userAlreadyExists(context);

	if (error.code === "USER_VALIDATION_ERROR")
		return userDomainError.userValidation(context);

	if (error.code === "USER_NOT_FOUND")
		return userDomainError.userNotFound(context);

	return userDomainError.userInternalError(context);
}
