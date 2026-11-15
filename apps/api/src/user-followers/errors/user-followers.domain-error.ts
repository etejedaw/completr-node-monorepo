import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "UserFollower Module";

export function userNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOWER_USER_NOT_FOUND",
		"User not found",
		context
	);
}

export function notFollowing(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOWER_NOT_FOLLOWING",
		"You are not following this user",
		context
	);
}

export function alreadyFollowing(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOWER_ALREADY_FOLLOWING",
		"You are already following this user",
		context
	);
}

export function validationError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOWER_VALIDATION_ERROR",
		"The follow is not valid",
		context
	);
}

export function internalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOWER_INTERNAL_ERROR",
		"Unexpected UserFollower Service error",
		context
	);
}
