import { type HttpErrorResponse } from "@angular/common/http";

const RAWG_ERROR_PREFIX = "RAWG_";

export function isRawgOutage(error: HttpErrorResponse): boolean {
	const type: unknown = error.error?.type;
	return typeof type === "string" && type.startsWith(RAWG_ERROR_PREFIX);
}
