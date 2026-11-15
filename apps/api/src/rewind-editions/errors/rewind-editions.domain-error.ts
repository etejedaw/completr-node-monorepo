import { DomainError } from "../../common/errors/domain-error";

const MODULE_NAME = "Rewind Editions Module";

export function editionNotFound(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_EDITION_NOT_FOUND",
		"Rewind edition not found",
		context
	);
}

export function editionExists(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_EDITION_EXISTS",
		"A Rewind edition already exists for this year",
		context
	);
}

export function editionOverlap(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_EDITION_OVERLAP",
		"The period overlaps another Rewind edition",
		context
	);
}

export function editionFrozen(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_EDITION_FROZEN",
		"A frozen Rewind edition cannot be edited",
		context
	);
}

export function editionInvalid(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_EDITION_INVALID",
		"The Rewind edition data is invalid",
		context
	);
}

export function rewindEditionsInternalError(context?: Record<string, unknown>) {
	return new DomainError(
		MODULE_NAME,
		"REWIND_EDITIONS_INTERNAL_ERROR",
		"Unexpected Rewind Editions Service error",
		context
	);
}
