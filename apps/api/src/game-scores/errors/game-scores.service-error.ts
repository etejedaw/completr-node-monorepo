import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "GameScore Service" };

export function notFoundError() {
	return new ServiceError("GAME_SCORE_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function unknownSourceError(source: string) {
	return new ServiceError("GAME_SCORE_UNKNOWN_SOURCE", {
		...BASE_OPTIONS,
		raw: { source }
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("GAME_SCORE_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
