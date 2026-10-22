import { backlogDomainToHttpMapper } from "../../src/backlog/errors/backlog.domain-to-http.mapper";
import { backlogErrorDomainNormalizer } from "../../src/backlog/errors/backlog.error-domain.normalizer";
import { backlogServiceToDomainMapper } from "../../src/backlog/errors/backlog.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Backlog",
	service: "Backlog Service",
	mapper: backlogServiceToDomainMapper,
	normalizer: backlogErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "BACKLOG_NOT_FOUND",
			module: "Backlog Module",
			code: "BACKLOG_NOT_FOUND",
			message: "Backlog entry not found"
		},
		{
			serviceCode: "BACKLOG_FORBIDDEN",
			module: "Backlog Module",
			code: "BACKLOG_FORBIDDEN",
			message: "You do not have permission to modify this backlog entry"
		},
		{
			serviceCode: "BACKLOG_VALIDATION_ERROR",
			module: "Backlog Module",
			code: "BACKLOG_VALIDATION_ERROR",
			message: "Backlog validation failed"
		},
		{
			serviceCode: "BACKLOG_UNIQUE_CONSTRAINT",
			module: "Backlog Module",
			code: "BACKLOG_UNIQUE_CONSTRAINT",
			message: "Backlog entry already exists"
		},
		{
			serviceCode: "BACKLOG_COMPILATION_CONTEXT_INVALID",
			module: "Backlog Module",
			code: "BACKLOG_COMPILATION_CONTEXT_INVALID",
			message: "Compilation context is invalid"
		}
	],
	fallback: {
		module: "Backlog Module",
		code: "BACKLOG_INTERNAL_ERROR",
		message: "Unexpected Backlog Service error"
	}
});

describeDomainToHttpMapper({
	name: "Backlog",
	mapper: backlogDomainToHttpMapper,
	cases: [
		{ code: "BACKLOG_NOT_FOUND", status: 404 },
		{ code: "BACKLOG_FORBIDDEN", status: 403 },
		{ code: "BACKLOG_VALIDATION_ERROR", status: 400 },
		{ code: "BACKLOG_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "BACKLOG_COMPILATION_CONTEXT_INVALID", status: 400 }
	]
});
