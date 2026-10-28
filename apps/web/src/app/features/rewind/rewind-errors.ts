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
