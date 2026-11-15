import { type HttpErrorResponse } from "@angular/common/http";

export function problemType(error: unknown): string | null {
	const type = (error as HttpErrorResponse | undefined)?.error?.type;
	return typeof type === "string" ? type : null;
}

export function isSourceUnavailable(error: unknown): boolean {
	return problemType(error) === "COMMON_SOURCE_UNAVAILABLE";
}
