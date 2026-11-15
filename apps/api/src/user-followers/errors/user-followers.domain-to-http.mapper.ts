import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const userFollowersDomainToHttpMapper = buildHttpErrorMapper({
	USER_FOLLOWER_USER_NOT_FOUND: 404,
	USER_FOLLOWER_NOT_FOLLOWING: 404,
	USER_FOLLOWER_ALREADY_FOLLOWING: 409,
	USER_FOLLOWER_VALIDATION_ERROR: 422
});
