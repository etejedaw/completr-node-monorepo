import { type HttpErrorResponse } from "@angular/common/http";

const CENTRALLY_NOTIFIED_STATUSES = new Set([402, 409, 422, 429]);

export function isCentrallyNotified(error: HttpErrorResponse): boolean {
	return CENTRALLY_NOTIFIED_STATUSES.has(error.status);
}
