import { type HttpErrorResponse } from "@angular/common/http";

export type RewindLoadError =
	"user_not_found" | "not_found" | "private" | "failed";

export function rewindLoadError(error: unknown): RewindLoadError | null {
	if (!error) return null;
	const response = error as HttpErrorResponse;
	if (response.status === 404) {
		return response.error?.type === "USER_NOT_FOUND"
			? "user_not_found"
			: "not_found";
	}
	if (response.status === 403) return "private";
	return "failed";
}

const PERIOD_CLOSED_ERROR_TYPE = "REWIND_PERIOD_CLOSED";
const YEAR_REQUIRES_PREMIUM_ERROR_TYPE = "REWIND_YEAR_REQUIRES_PREMIUM";
const REGENERATION_LIMIT_ERROR_TYPE = "REWIND_REGENERATION_LIMIT";
const AI_RECAP_IN_PROGRESS_ERROR_TYPE = "REWIND_AI_RECAP_IN_PROGRESS";
const AI_RECAP_DAILY_LIMIT_ERROR_TYPE = "REWIND_AI_RECAP_DAILY_LIMIT";

function errorType(response: HttpErrorResponse | undefined): unknown {
	return response?.error?.type;
}

export type RewindGenerateError =
	| "conflict"
	| "limit"
	| "period_closed"
	| "year_requires_premium"
	| "premium_required"
	| "not_found"
	| "rate_limited"
	| "daily_limit"
	| "invalid"
	| "failed"
	| "network";

export const BLOCKING_GENERATE_ERRORS: readonly RewindGenerateError[] = [
	"limit",
	"not_found",
	"period_closed",
	"year_requires_premium",
	"premium_required"
];

export function rewindGenerateError(error: unknown): RewindGenerateError {
	const response = error as HttpErrorResponse;
	if (response?.status === 0) return "network";
	if (response?.status === 409) {
		const type = errorType(response);
		if (type === REGENERATION_LIMIT_ERROR_TYPE) return "limit";
		if (type === PERIOD_CLOSED_ERROR_TYPE) return "period_closed";
		return "conflict";
	}
	if (
		response?.status === 403 &&
		errorType(response) === YEAR_REQUIRES_PREMIUM_ERROR_TYPE
	)
		return "year_requires_premium";
	if (response?.status === 402) return "premium_required";
	if (response?.status === 404) return "not_found";
	if (response?.status === 422) return "invalid";
	if (response?.status === 429) return rateLimitKind(response);
	return "failed";
}

function rateLimitKind(
	response: HttpErrorResponse
): "daily_limit" | "rate_limited" {
	return errorType(response) === AI_RECAP_DAILY_LIMIT_ERROR_TYPE
		? "daily_limit"
		: "rate_limited";
}

export type RewindAiRecapError =
	| "premium_required"
	| "year_requires_premium"
	| "period_closed"
	| "limit"
	| "exists"
	| "in_progress"
	| "not_generated"
	| "rate_limited"
	| "daily_limit"
	| "failed"
	| "network";

export function rewindAiRecapError(error: unknown): RewindAiRecapError {
	const response = error as HttpErrorResponse;
	if (response?.status === 0) return "network";
	if (response?.status === 402) return "premium_required";
	if (
		response?.status === 403 &&
		errorType(response) === YEAR_REQUIRES_PREMIUM_ERROR_TYPE
	)
		return "year_requires_premium";
	if (response?.status === 409) {
		const type = errorType(response);
		if (type === AI_RECAP_IN_PROGRESS_ERROR_TYPE) return "in_progress";
		if (type === PERIOD_CLOSED_ERROR_TYPE) return "period_closed";
		if (type === REGENERATION_LIMIT_ERROR_TYPE) return "limit";
		return "exists";
	}
	if (response?.status === 404) return "not_generated";
	if (response?.status === 429) return rateLimitKind(response);
	return "failed";
}
