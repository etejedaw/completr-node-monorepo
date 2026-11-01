import { type HttpErrorResponse } from "@angular/common/http";

import { adminErrorMessage } from "../../../core/utils/admin-error-message";

const STATUS_MESSAGES: Record<number, string> = {
	0: "Couldn't reach the server. Check your connection and try again.",
	403: "Your account can't refresh external data.",
	404: "This game no longer exists or is inactive. Refresh the page to see its current state.",
	422: "The server rejected this request. Check the selected sources and try again."
};

const FALLBACK_MESSAGE =
	"Couldn't refresh the external data. Try again in a moment.";

export function externalDataRefreshErrorMessage(error: unknown): string {
	const known = adminErrorMessage(error);
	if (known) return known;
	const status = (error as HttpErrorResponse | undefined)?.status;
	if (typeof status === "number" && Object.hasOwn(STATUS_MESSAGES, status))
		return STATUS_MESSAGES[status];
	return FALLBACK_MESSAGE;
}
