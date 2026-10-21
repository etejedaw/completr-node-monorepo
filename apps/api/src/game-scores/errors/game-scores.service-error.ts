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

export function scoreOutOfRangeError(
	source: string,
	score: number,
	scale: number
) {
	return new ServiceError("GAME_SCORE_OUT_OF_RANGE", {
		...BASE_OPTIONS,
		raw: { source, score, scale }
	});
}

export function gameNotFoundError(gameId: string) {
	return new ServiceError("GAME_SCORE_GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: { gameId }
	});
}

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("GAME_SCORE_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
