import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const userFollowRequestsDomainToHttpMapper = buildHttpErrorMapper({
	USER_FOLLOW_REQUEST_USER_NOT_FOUND: 404,
	USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF: 400,
	USER_FOLLOW_REQUEST_ALREADY_REQUESTED: 409,
	USER_FOLLOW_REQUEST_ALREADY_FOLLOWING: 409,
	USER_FOLLOW_REQUEST_NOT_FOUND: 404
});
