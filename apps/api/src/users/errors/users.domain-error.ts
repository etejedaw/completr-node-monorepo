import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "User Module";

export function userAlreadyExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_ALREADY_EXISTS",
		"Email or username already exists",
		context
	);
}

export function userNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_NOT_FOUND",
		"User not found",
		context
	);
}

export function userValidation(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_VALIDATION_ERROR",
		"Fields are incorrect",
		context
	);
}

export function userPrivate(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_PRIVATE",
		"This account is private",
		context
	);
}

export function userThemeForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_THEME_FORBIDDEN",
		"This theme requires a premium account",
		context
	);
}

export function userDeleteForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_DELETE_FORBIDDEN",
		"This account cannot be deleted",
		context
	);
}

export function userInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_INTERNAL_ERROR",
		"Unexpected Users Service error",
		context
	);
}
