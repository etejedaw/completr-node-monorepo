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

export function periodClosedError() {
	return new ServiceError("REWIND_PERIOD_CLOSED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function yearRequiresPremiumError() {
	return new ServiceError("REWIND_YEAR_REQUIRES_PREMIUM", {
		...BASE_OPTIONS,
		raw: undefined
	});
}

export function noAiAccessError() {
	return new ServiceError("REWIND_NO_AI_ACCESS", {
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

export function aiRecapDailyLimitError(rawError: unknown) {
	return new ServiceError("REWIND_AI_RECAP_DAILY_LIMIT", {
		...BASE_OPTIONS,
		raw: rawError
	});
}

export function aiRecapFailedError() {
	return new ServiceError("REWIND_AI_RECAP_FAILED", {
		...BASE_OPTIONS,
		raw: undefined
	});
}
