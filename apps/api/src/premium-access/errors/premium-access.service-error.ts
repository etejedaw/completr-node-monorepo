import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Premium Access Service" };

export function internalError(raw: unknown) {
	return new ServiceError("PREMIUM_ACCESS_INTERNAL_ERROR", {
		...BASE_OPTIONS,
		raw
	});
}
