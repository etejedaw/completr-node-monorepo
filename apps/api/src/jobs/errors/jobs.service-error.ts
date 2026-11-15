import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Jobs Service" };

export function notFoundError() {
	return new ServiceError("JOB_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
