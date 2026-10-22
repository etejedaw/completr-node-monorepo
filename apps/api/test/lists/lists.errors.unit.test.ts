import { listsDomainToHttpMapper } from "../../src/lists/errors/lists.domain-to-http.mapper";
import { listsErrorDomainNormalizer } from "../../src/lists/errors/lists.error-domain.normalizer";
import { listsServiceToDomainMapper } from "../../src/lists/errors/lists.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Lists",
	service: "List Service",
	mapper: listsServiceToDomainMapper,
	normalizer: listsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "LIST_NOT_FOUND",
			module: "List Module",
			code: "LIST_NOT_FOUND",
			message: "List not found"
		},
		{
			serviceCode: "LIST_FORBIDDEN",
			module: "List Module",
			code: "LIST_FORBIDDEN",
			message: "You do not have permission to modify this list"
		},
		{
			serviceCode: "LIST_UNIQUE_CONSTRAINT",
			module: "List Module",
			code: "LIST_UNIQUE_CONSTRAINT",
			message: "List already exists"
		},
		{
			serviceCode: "LIST_VALIDATION_ERROR",
			module: "List Module",
			code: "LIST_VALIDATION_ERROR",
			message: "List validation failed"
		},
		{
			serviceCode: "LIST_LIMIT_REACHED",
			module: "List Module",
			code: "LIST_LIMIT_REACHED",
			message:
				"Free users can create up to 5 lists. Upgrade to premium for unlimited."
		},
		{
			serviceCode: "LIST_SCORE_SOURCE_NOT_FOUND",
			module: "List Module",
			code: "LIST_SCORE_SOURCE_NOT_FOUND",
			message: "Score source does not exist in the catalog"
		},
		{
			serviceCode: "LIST_FROZEN",
			module: "List Module",
			code: "LIST_FROZEN",
			message:
				"This list is frozen. Delete lists until you have 5 or less, or upgrade to premium."
		}
	],
	fallback: {
		module: "List Module",
		code: "LIST_INTERNAL_ERROR",
		message: "Unexpected List Service error"
	}
});

describeDomainToHttpMapper({
	name: "Lists",
	mapper: listsDomainToHttpMapper,
	cases: [
		{ code: "LIST_NOT_FOUND", status: 404 },
		{ code: "LIST_FORBIDDEN", status: 403 },
		{ code: "LIST_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "LIST_VALIDATION_ERROR", status: 400 },
		{ code: "LIST_LIMIT_REACHED", status: 402 },
		{ code: "LIST_SCORE_SOURCE_NOT_FOUND", status: 422 },
		{ code: "LIST_FROZEN", status: 402 }
	]
});
