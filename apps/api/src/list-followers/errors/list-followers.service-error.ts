import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "ListFollower Service" };

export function listNotFoundError() {
	return new ServiceError("LIST_FOLLOWER_LIST_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notPublicError() {
	return new ServiceError("LIST_FOLLOWER_NOT_PUBLIC", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyFollowingError() {
	return new ServiceError("LIST_FOLLOWER_ALREADY_FOLLOWING", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFollowingError() {
	return new ServiceError("LIST_FOLLOWER_NOT_FOLLOWING", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
