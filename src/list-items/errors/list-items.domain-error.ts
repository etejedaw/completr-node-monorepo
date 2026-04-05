import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "ListItem Module";

export function listItemNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_NOT_FOUND",
		"List item not found",
		context
	);
}

export function listItemListNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_LIST_NOT_FOUND",
		"List not found",
		context
	);
}

export function listItemForbidden(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_FORBIDDEN",
		"You do not have permission to modify items in this list",
		context
	);
}

export function listItemUniqueConstraint(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_UNIQUE_CONSTRAINT",
		"Game already exists in this list",
		context
	);
}

export function listItemInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_INTERNAL_ERROR",
		"Unexpected ListItem Service error",
		context
	);
}
