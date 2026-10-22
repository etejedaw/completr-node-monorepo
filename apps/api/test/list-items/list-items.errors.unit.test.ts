import { listItemsDomainToHttpMapper } from "../../src/list-items/errors/list-items.domain-to-http.mapper";
import { listItemsErrorDomainNormalizer } from "../../src/list-items/errors/list-items.error-domain.normalizer";
import { listItemsServiceToDomainMapper } from "../../src/list-items/errors/list-items.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "ListItems",
	service: "ListItem Service",
	mapper: listItemsServiceToDomainMapper,
	normalizer: listItemsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "LIST_ITEM_LIST_NOT_FOUND",
			module: "ListItem Module",
			code: "LIST_ITEM_LIST_NOT_FOUND",
			message: "List not found"
		},
		{
			serviceCode: "LIST_ITEM_FORBIDDEN",
			module: "ListItem Module",
			code: "LIST_ITEM_FORBIDDEN",
			message: "You do not have permission to modify items in this list"
		},
		{
			serviceCode: "LIST_ITEM_GAMES_NOT_FOUND",
			module: "ListItem Module",
			code: "LIST_ITEM_GAMES_NOT_FOUND",
			message: "One or more games were not found"
		},
		{
			serviceCode: "LIST_ITEM_FROZEN",
			module: "ListItem Module",
			code: "LIST_ITEM_FROZEN",
			message:
				"This list is frozen. Delete lists until you have 5 or less, or upgrade to premium."
		}
	],
	fallback: {
		module: "ListItem Module",
		code: "LIST_ITEM_INTERNAL_ERROR",
		message: "Unexpected ListItem Service error"
	}
});

describeDomainToHttpMapper({
	name: "ListItems",
	mapper: listItemsDomainToHttpMapper,
	cases: [
		{ code: "LIST_ITEM_LIST_NOT_FOUND", status: 404 },
		{ code: "LIST_ITEM_FORBIDDEN", status: 403 },
		{ code: "LIST_ITEM_GAMES_NOT_FOUND", status: 404 },
		{ code: "LIST_ITEM_FROZEN", status: 402 }
	]
});
