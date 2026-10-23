import { usersDomainToHttpMapper } from "../../src/users/errors/users.domain-to-http.mapper";
import { usersErrorDomainNormalizer } from "../../src/users/errors/users.error-domain.normalizer";
import { usersServiceToDomainMapper } from "../../src/users/errors/users.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Users",
	service: "Users Service",
	mapper: usersServiceToDomainMapper,
	normalizer: usersErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "USER_UNIQUE_CONSTRAINT",
			module: "User Module",
			code: "USER_ALREADY_EXISTS",
			message: "Email or username already exists"
		},
		{
			serviceCode: "USER_VALIDATION_ERROR",
			module: "User Module",
			code: "USER_VALIDATION_ERROR",
			message: "Fields are incorrect"
		},
		{
			serviceCode: "USER_NOT_FOUND",
			module: "User Module",
			code: "USER_NOT_FOUND",
			message: "User not found"
		},
		{
			serviceCode: "USER_THEME_FORBIDDEN",
			module: "User Module",
			code: "USER_THEME_FORBIDDEN",
			message: "This theme requires a premium account"
		}
	],
	fallback: {
		module: "User Module",
		code: "USER_INTERNAL_ERROR",
		message: "Unexpected Users Service error"
	}
});

describeDomainToHttpMapper({
	name: "Users",
	mapper: usersDomainToHttpMapper,
	cases: [
		{ code: "USER_NOT_FOUND", status: 404 },
		{ code: "USER_VALIDATION_ERROR", status: 400 },
		{ code: "USER_PRIVATE", status: 403 },
		{ code: "USER_THEME_FORBIDDEN", status: 403 },
		{ code: "USER_ALREADY_EXISTS", status: 409 }
	]
});
