import { buildHttpErrorMapper } from "../../common/errors/build-http-error-mapper";

export const authDomainToHttpMapper = buildHttpErrorMapper({
	AUTH_USER_ALREADY_EXISTS: {
		status: 409,
		detail: "The email or username are already registered. Use a different"
	},
	AUTH_INVALID_CREDENTIALS: {
		status: 401,
		detail: "Invalid email or password"
	},
	AUTH_INVALID_CURRENT_PASSWORD: {
		status: 400,
		detail: "The current password does not match"
	},
	AUTH_INVALID_TOKEN: {
		status: 401,
		detail: "The access token is invalid or expired"
	},
	AUTH_SCHEMA_INVALID: {
		status: 422,
		detail: "The provided authentication data does not match the required format"
	},
	AUTH_RATE_LIMITED: {
		status: 429,
		detail: "Too many authentication attempts. Please try again later."
	},
	AUTH_FORBIDDEN: {
		status: 403,
		detail: "Your role does not grant permission"
	},
	AUTH_INVALID_REFRESH_TOKEN: {
		status: 401,
		detail: "The refresh token is invalid, expired or has already been used"
	},
	AUTH_INVALID_PASSWORD_RESET_TOKEN: {
		status: 400,
		detail: "The password reset link is invalid, expired or has already been used"
	},
	AUTH_ROUTE_NOT_FOUND: {
		status: 404,
		detail: "The requested resource was not found"
	}
});
