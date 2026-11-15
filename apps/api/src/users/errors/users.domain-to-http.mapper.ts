import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const usersDomainToHttpMapper = buildHttpErrorMapper({
	USER_NOT_FOUND: 404,
	USER_VALIDATION_ERROR: 400,
	USER_PRIVATE: 403,
	USER_THEME_FORBIDDEN: 403,
	USER_ALREADY_EXISTS: 409,
	USER_DELETE_FORBIDDEN: 409
});
