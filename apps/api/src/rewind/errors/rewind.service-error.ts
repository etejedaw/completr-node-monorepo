import { ServiceError } from "../../common/errors/service-error";

const BASE_OPTIONS = { service: "Rewind Service" };

export function notFoundError() {
	return new ServiceError("REWIND_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function userNotFoundError() {
	return new ServiceError("USER_NOT_FOUND", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function userPrivateError() {
	return new ServiceError("USER_PRIVATE", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function notGeneratedError() {
	return new ServiceError("REWIND_NOT_GENERATED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function generationConflictError() {
	return new ServiceError("REWIND_GENERATION_CONFLICT", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function regenerationLimitError() {
	return new ServiceError("REWIND_REGENERATION_LIMIT", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function aiRecapPremiumRequiredError() {
	return new ServiceError("REWIND_AI_RECAP_PREMIUM_REQUIRED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function aiRecapExistsError() {
	return new ServiceError("REWIND_AI_RECAP_EXISTS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function aiRecapInProgressError() {
	return new ServiceError("REWIND_AI_RECAP_IN_PROGRESS", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function aiRecapFailedError() {
	return new ServiceError("REWIND_AI_RECAP_FAILED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
