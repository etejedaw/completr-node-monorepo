import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "GamePlatinum Service" };

export function gameNotFoundError() {
	return new ServiceError("GAME_PLATINUM_GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFoundError() {
	return new ServiceError("GAME_PLATINUM_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function backlogNotFoundError() {
	return new ServiceError("GAME_PLATINUM_BACKLOG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function backlogGameMismatchError() {
	return new ServiceError("GAME_PLATINUM_BACKLOG_GAME_MISMATCH", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function platformNotFoundError() {
	return new ServiceError("GAME_PLATINUM_PLATFORM_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function uniqueConstraintError(raw: unknown) {
	return new ServiceError("GAME_PLATINUM_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw
	});
}

export function validationError(raw: unknown) {
	return new ServiceError("GAME_PLATINUM_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw
	});
}
