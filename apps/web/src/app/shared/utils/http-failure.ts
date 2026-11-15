import { HttpErrorResponse } from "@angular/common/http";

import { type ToastService } from "../../core/services/toast";
import { isToastedByErrorInterceptor } from "../../core/utils/toasted-error-statuses";

const NOT_FOUND_STATUS = 404;

export function isNotFound(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse && error.status === NOT_FOUND_STATUS
	);
}

export function reportHttpFailure(
	toast: Pick<ToastService, "error">,
	error: unknown,
	message: string
): void {
	if (!(error instanceof HttpErrorResponse)) return;
	if (isToastedByErrorInterceptor(error.status)) return;
	toast.error(message);
}

export function problemTitle(error: unknown): string | null {
	if (!(error instanceof HttpErrorResponse)) return null;
	const title: unknown = error.error?.title;
	return typeof title === "string" && title.length > 0 ? title : null;
}
