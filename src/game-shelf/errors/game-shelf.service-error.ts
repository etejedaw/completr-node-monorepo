import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "GameShelf Service" };

export function validationError(rawError: unknown) {
	return new ServiceError("GAME_SHELF_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("GAME_SHELF_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notFoundError() {
	return new ServiceError("GAME_SHELF_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("GAME_SHELF_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
