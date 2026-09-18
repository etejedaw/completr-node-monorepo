import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Game External Service" };

export function notFoundError() {
	return new ServiceError("GAME_EXTERNAL_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("GAME_EXTERNAL_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
