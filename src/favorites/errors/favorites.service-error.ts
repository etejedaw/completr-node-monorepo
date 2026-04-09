import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Favorite Service" };

export function limitReachedError() {
	return new ServiceError("FAVORITE_LIMIT_REACHED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function gamesNotFoundError(missing: string[]) {
	return new ServiceError("FAVORITE_GAMES_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: { missing }
	});
}
