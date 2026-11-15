import { authDomainToHttpMapper } from "../../src/auth/errors/auth.domain-to-http.mapper";
import { authErrorDomainNormalizer } from "../../src/auth/errors/auth.error-domain.normalizer";
import { authServiceToDomainMapper } from "../../src/auth/errors/auth.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Auth",
	service: "Auth Service",
	mapper: authServiceToDomainMapper,
	normalizer: authErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "AUTH_USER_ALREADY_EXISTS",
			module: "Auth Module",
			code: "AUTH_USER_ALREADY_EXISTS",
			message: "Username or email are already registered"
		},
		{
			serviceCode: "AUTH_INVALID_CREDENTIALS",
			module: "Auth Module",
			code: "AUTH_INVALID_CREDENTIALS",
			message: "Invalid email or password"
		},
		{
			serviceCode: "AUTH_INVALID_TOKEN",
			module: "Auth Module",
			code: "AUTH_INVALID_TOKEN",
			message: "Invalid Token"
		},
		{
			serviceCode: "AUTH_INVALID_CURRENT_PASSWORD",
			module: "Auth Module",
			code: "AUTH_INVALID_CURRENT_PASSWORD",
			message: "The current password is incorrect"
		},
		{
			serviceCode: "AUTH_INVALID_REFRESH_TOKEN",
			module: "Auth Module",
			code: "AUTH_INVALID_REFRESH_TOKEN",
			message: "Invalid or expired refresh token"
		},
		{
			serviceCode: "AUTH_INVALID_PASSWORD_RESET_TOKEN",
			module: "Auth Module",
			code: "AUTH_INVALID_PASSWORD_RESET_TOKEN",
			message: "Invalid or expired password reset token"
		}
	],
	fallback: {
		module: "Auth Module",
		code: "AUTH_INTERNAL_ERROR",
		message: "Unexpected Auth Service error"
	}
});

describeDomainToHttpMapper({
	name: "Auth",
	mapper: authDomainToHttpMapper,
	cases: [
		{
			code: "AUTH_USER_ALREADY_EXISTS",
			status: 409,
			detail: "The email or username are already registered. Use a different"
		},
		{
			code: "AUTH_INVALID_CREDENTIALS",
			status: 401,
			detail: "Invalid email or password"
		},
		{
			code: "AUTH_INVALID_CURRENT_PASSWORD",
			status: 400,
			detail: "The current password does not match"
		},
		{
			code: "AUTH_INVALID_TOKEN",
			status: 401,
			detail: "The access token is invalid or expired"
		},
		{
			code: "AUTH_SCHEMA_INVALID",
			status: 422,
			detail: "The provided authentication data does not match the required format"
		},
		{
			code: "AUTH_RATE_LIMITED",
			status: 429,
			detail: "Too many authentication attempts. Please try again later."
		},
		{
			code: "AUTH_FORBIDDEN",
			status: 403,
			detail: "Your role does not grant permission"
		},
		{
			code: "AUTH_INVALID_REFRESH_TOKEN",
			status: 401,
			detail: "The refresh token is invalid, expired or has already been used"
		},
		{
			code: "AUTH_INVALID_PASSWORD_RESET_TOKEN",
			status: 400,
			detail: "The password reset link is invalid, expired or has already been used"
		},
		{
			code: "AUTH_ROUTE_NOT_FOUND",
			status: 404,
			detail: "The requested resource was not found"
		}
	]
});
