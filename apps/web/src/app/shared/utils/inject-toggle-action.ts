import { HttpErrorResponse } from "@angular/common/http";
import { inject, signal } from "@angular/core";

import { ToastService } from "../../core/services/toast";
import { isToastedByErrorInterceptor } from "../../core/utils/toasted-error-statuses";
import { type ToggleActionRequest } from "./inject-toggle-action.model";

const NOT_FOUND_STATUS = 404;

export function injectToggleAction() {
	const toast = inject(ToastService);
	const pendingKeys = signal<ReadonlySet<string>>(new Set());

	const setPending = (key: string, pending: boolean) =>
		pendingKeys.update(keys => {
			const next = new Set(keys);
			if (pending) next.add(key);
			else next.delete(key);
			return next;
		});

	const isPending = (key: string) => pendingKeys().has(key);

	const reportFailure = (error: unknown, action: ToggleActionRequest) => {
		if (!(error instanceof HttpErrorResponse)) return;
		if (error.status === NOT_FOUND_STATUS) {
			if (action.missingMessage) toast.error(action.missingMessage);
			action.onMissing?.();
			return;
		}
		if (isToastedByErrorInterceptor(error.status)) return;
		toast.error(action.failureMessage);
	};

	const run = (action: ToggleActionRequest) => {
		if (isPending(action.key)) return;
		setPending(action.key, true);
		action.request.subscribe({
			next: () => {
				setPending(action.key, false);
				action.onSuccess?.();
			},
			error: (error: unknown) => {
				setPending(action.key, false);
				reportFailure(error, action);
			}
		});
	};

	return { isPending, run };
}
