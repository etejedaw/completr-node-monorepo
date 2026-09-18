import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "UserFollowRequest Service" };

export function userNotFoundError() {
	return new ServiceError("USER_FOLLOW_REQUEST_USER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function cannotRequestSelfError() {
	return new ServiceError("USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyRequestedError() {
	return new ServiceError("USER_FOLLOW_REQUEST_ALREADY_REQUESTED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyFollowingError() {
	return new ServiceError("USER_FOLLOW_REQUEST_ALREADY_FOLLOWING", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFoundError() {
	return new ServiceError("USER_FOLLOW_REQUEST_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notAcceptingRequestsError() {
	return new ServiceError("USER_FOLLOW_REQUEST_NOT_ACCEPTING", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
