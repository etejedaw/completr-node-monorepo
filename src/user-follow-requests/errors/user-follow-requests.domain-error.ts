import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "UserFollowRequest Module";

export function userNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_USER_NOT_FOUND",
		"User not found",
		context
	);
}

export function cannotRequestSelf(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF",
		"You cannot send a follow request to yourself",
		context
	);
}

export function alreadyRequested(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_ALREADY_REQUESTED",
		"You already requested to follow this user",
		context
	);
}

export function alreadyFollowing(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_ALREADY_FOLLOWING",
		"You are already following this user",
		context
	);
}

export function notFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_NOT_FOUND",
		"Follow request not found",
		context
	);
}

export function notAcceptingRequests(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_NOT_ACCEPTING",
		"This user is not accepting follow requests",
		context
	);
}

export function internalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"USER_FOLLOW_REQUEST_INTERNAL_ERROR",
		"Unexpected UserFollowRequest Service error",
		context
	);
}
