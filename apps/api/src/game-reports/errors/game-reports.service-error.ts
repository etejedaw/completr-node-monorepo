import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "GameReport Service" };

export function gameNotFoundError() {
	return new ServiceError("GAME_REPORT_GAME_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function alreadyReportedError() {
	return new ServiceError("GAME_REPORT_ALREADY_REPORTED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notFoundError() {
	return new ServiceError("GAME_REPORT_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
