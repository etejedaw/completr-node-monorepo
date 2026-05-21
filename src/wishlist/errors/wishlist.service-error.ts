import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Wishlist Service" };

export function limitReachedError() {
	return new ServiceError("WISHLIST_LIMIT_REACHED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function gamesNotFoundError(missing: string[]) {
	return new ServiceError("WISHLIST_GAMES_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: { missing }
	});
}

export function alreadyExistsError() {
	return new ServiceError("WISHLIST_ALREADY_EXISTS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFoundError() {
	return new ServiceError("WISHLIST_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
