import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "ListFollower Module";

export function listFollowerListNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FOLLOWER_LIST_NOT_FOUND",
		"List not found",
		context
	);
}

export function listFollowerNotPublic(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FOLLOWER_NOT_PUBLIC",
		"Cannot follow a private list",
		context
	);
}

export function listFollowerAlreadyFollowing(
	context?: Record<string, unknown>
) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FOLLOWER_ALREADY_FOLLOWING",
		"You are already following this list",
		context
	);
}

export function listFollowerNotFollowing(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FOLLOWER_NOT_FOLLOWING",
		"You are not following this list",
		context
	);
}

export function listFollowerInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_FOLLOWER_INTERNAL_ERROR",
		"Unexpected ListFollower Service error",
		context
	);
}
