import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "CoopRuns Service" };

export function backlogNotFoundError() {
	return new ServiceError("COOP_BACKLOG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("COOP_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function targetUserNotFoundError() {
	return new ServiceError("COOP_TARGET_USER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFollowingError() {
	return new ServiceError("COOP_TARGET_NOT_FOLLOWED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function selfTagError() {
	return new ServiceError("COOP_SELF_TAG", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyTaggedError() {
	return new ServiceError("COOP_ALREADY_TAGGED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function memberNotFoundError() {
	return new ServiceError("COOP_MEMBER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function sourceBacklogNotInRunError() {
	return new ServiceError("COOP_SOURCE_NOT_IN_RUN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
