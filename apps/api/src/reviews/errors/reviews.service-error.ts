import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Review Service" };

export function notFoundError() {
	return new ServiceError("REVIEW_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("REVIEW_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyExistsError() {
	return new ServiceError("REVIEW_ALREADY_EXISTS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function gameNotFoundError() {
	return new ServiceError("REVIEW_GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
