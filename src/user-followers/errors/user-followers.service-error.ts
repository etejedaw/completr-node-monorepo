import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "UserFollower Service" };

export function userNotFoundError() {
	return new ServiceError("USER_FOLLOWER_USER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFollowingError() {
	return new ServiceError("USER_FOLLOWER_NOT_FOLLOWING", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
