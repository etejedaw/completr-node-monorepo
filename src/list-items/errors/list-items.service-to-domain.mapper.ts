import { DomainError } from "../../common/errors/domain-error";
import { ServiceError } from "../../common/errors/service-error";
import * as listItemDomainError from "./list-items.domain-error";

export function listItemsServiceToDomainMapper(
	error: unknown,
	correlationId: string
): DomainError {
	if (!(error instanceof ServiceError)) throw error;

	const context = { ...error.serviceError, correlationId };

	if (error.code === "LIST_ITEM_LIST_NOT_FOUND")
		return listItemDomainError.listItemListNotFound(context);

	if (error.code === "LIST_ITEM_FORBIDDEN")
		return listItemDomainError.listItemForbidden(context);

	if (error.code === "LIST_ITEM_GAMES_NOT_FOUND")
		return listItemDomainError.listItemGamesNotFound(context);

	if (error.code === "LIST_ITEM_FROZEN")
		return listItemDomainError.listItemFrozen(context);

	return listItemDomainError.listItemInternalError(context);
}
