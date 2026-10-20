import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Invitation Service" };

export function uniqueConstraintError(rawError: unknown) {
	return new ServiceError("INVITATION_UNIQUE_CONSTRAINT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function validationError(rawError: unknown) {
	return new ServiceError("INVITATION_VALIDATION_ERROR", {
		...BASE_OPTIONS,
		raw: rawError
	});
}
