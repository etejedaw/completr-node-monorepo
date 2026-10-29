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

export type RewindGenerateError =
	| "conflict"
	| "limit"
	| "not_found"
	| "rate_limited"
	| "invalid"
	| "failed"
	| "network";

export function rewindGenerateError(error: unknown): RewindGenerateError {
	const response = error as HttpErrorResponse;
	if (response?.status === 0) return "network";
	if (response?.status === 409) {
		return response.error?.type === "REWIND_REGENERATION_LIMIT"
			? "limit"
			: "conflict";
	}
	if (response?.status === 404) return "not_found";
	if (response?.status === 422) return "invalid";
	if (response?.status === 429) return "rate_limited";
	return "failed";
}

export type RewindAiRecapError =
	| "premium_required"
	| "exists"
	| "in_progress"
	| "not_generated"
	| "rate_limited"
	| "failed"
	| "network";

export function rewindAiRecapError(error: unknown): RewindAiRecapError {
	const response = error as HttpErrorResponse;
	if (response?.status === 0) return "network";
	if (response?.status === 402) return "premium_required";
	if (response?.status === 409) {
		return response.error?.type === "REWIND_AI_RECAP_IN_PROGRESS"
			? "in_progress"
			: "exists";
	}
	if (response?.status === 404) return "not_generated";
	if (response?.status === 429) return "rate_limited";
	return "failed";
}
