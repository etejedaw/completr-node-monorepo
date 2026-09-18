import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "BacklogProgress Service" };

export function backlogNotFoundError() {
	return new ServiceError("BACKLOG_PROGRESS_BACKLOG_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function forbiddenError() {
	return new ServiceError("BACKLOG_PROGRESS_FORBIDDEN", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function noteNotFoundError() {
	return new ServiceError("BACKLOG_PROGRESS_NOTE_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
