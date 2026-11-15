import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "ListItem Module";

export function listItemListNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_LIST_NOT_FOUND",
		"List not found",
		context
	);
}

export function listItemGamesNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_GAMES_NOT_FOUND",
		"One or more games were not found",
		context
	);
}

export function listItemFrozen(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_FROZEN",
		"This list is frozen. Delete lists until you have 5 or less, or upgrade to premium.",
		context
	);
}

export function listItemAlreadyInList(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_UNIQUE_CONSTRAINT",
		"The game is already in the list",
		context
	);
}

export function listItemValidationError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"LIST_ITEM_VALIDATION_ERROR",
		"The list item is not valid",
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
