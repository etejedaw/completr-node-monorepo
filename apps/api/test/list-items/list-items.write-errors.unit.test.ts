import { listItemsDomainToHttpMapper } from "../../src/list-items/errors/list-items.domain-to-http.mapper";
import { listItemsErrorDomainNormalizer } from "../../src/list-items/errors/list-items.error-domain.normalizer";
import { listItemsServiceToDomainMapper } from "../../src/list-items/errors/list-items.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "ListItems write errors",
	service: "ListItem Service",
	mapper: listItemsServiceToDomainMapper,
	normalizer: listItemsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "LIST_ITEM_UNIQUE_CONSTRAINT",
			module: "ListItem Module",
			code: "LIST_ITEM_UNIQUE_CONSTRAINT",
			message: "The game is already in the list"
		},
		{
			serviceCode: "LIST_ITEM_VALIDATION_ERROR",
			module: "ListItem Module",
			code: "LIST_ITEM_VALIDATION_ERROR",
			message: "The list item is not valid"
		}
	],
	fallback: {
		module: "ListItem Module",
		code: "LIST_ITEM_INTERNAL_ERROR",
		message: "Unexpected ListItem Service error"
	}
});

describeDomainToHttpMapper({
	name: "ListItems write errors",
	mapper: listItemsDomainToHttpMapper,
	cases: [
		{ code: "LIST_ITEM_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "LIST_ITEM_VALIDATION_ERROR", status: 422 }
	]
});
