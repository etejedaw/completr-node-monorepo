import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Games Service" };

export function validationError(rawError: unknown) {
	return new ServiceError("GAME_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("GAME_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function notFoundError() {
	return new ServiceError("GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function platformNotFoundError() {
	return new ServiceError("GAME_PLATFORM_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function genreNotFoundError() {
	return new ServiceError("GAME_GENRE_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
