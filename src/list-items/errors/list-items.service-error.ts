import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "ListItem Service" };

export function notFoundError() {
	return new ServiceError("LIST_ITEM_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function listNotFoundError() {
	return new ServiceError("LIST_ITEM_LIST_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("LIST_ITEM_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("LIST_ITEM_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
