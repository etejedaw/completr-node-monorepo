import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "CoopRuns Module";

export function backlogNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_BACKLOG_NOT_FOUND",
		"Backlog not found",
		context
	);
}

export function forbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_FORBIDDEN",
		"Not allowed to modify co-op on this backlog",
		context
	);
}

export function targetUserNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_TARGET_USER_NOT_FOUND",
		"Target user does not exist",
		context
	);
}

export function notFollowing(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_TARGET_NOT_FOLLOWED",
		"You can only tag users you follow",
		context
	);
}

export function selfTag(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_SELF_TAG",
		"You cannot tag yourself",
		context
	);
}

export function alreadyTagged(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_ALREADY_TAGGED",
		"User is already part of this run",
		context
	);
}

export function memberNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_MEMBER_NOT_FOUND",
		"User is not part of this run",
		context
	);
}

export function sourceBacklogNotInRun(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_SOURCE_NOT_IN_RUN",
		"Source backlog is not part of this run",
		context
	);
}

export function coopRunsInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"COOP_INTERNAL_ERROR",
		"Unexpected CoopRuns Service error",
		context
	);
}
