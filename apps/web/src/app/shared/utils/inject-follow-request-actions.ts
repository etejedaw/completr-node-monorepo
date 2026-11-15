import { type HttpErrorResponse } from "@angular/common/http";
import { inject, signal } from "@angular/core";

import { FollowRequestsService } from "../../core/services/follow-requests";
import { ToastService } from "../../core/services/toast";

const REQUEST_NOT_FOUND_STATUS = 404;

export function injectFollowRequestActions() {
	const followRequests = inject(FollowRequestsService);
	const toast = inject(ToastService);
	const resolvingId = signal<string | null>(null);

	function resolve(
		requesterId: string,
		action: "accept" | "reject",
		successMessage: string | null,
		failureMessage: string
	) {
		if (resolvingId()) return;
		resolvingId.set(requesterId);
		followRequests[action](requesterId).subscribe({
			next: () => {
				resolvingId.set(null);
				if (successMessage) toast.success(successMessage);
			},
			error: (error: HttpErrorResponse) => {
				resolvingId.set(null);
				if (error.status === REQUEST_NOT_FOUND_STATUS) {
					followRequests.removeLocally(requesterId);
					return;
				}
				toast.warning(failureMessage);
			}
		});
	}

	return {
		resolvingId: resolvingId.asReadonly(),
		accept: (requesterId: string) =>
			resolve(
				requesterId,
				"accept",
				"Follow request accepted.",
				"Could not accept the request."
			),
		reject: (requesterId: string) =>
			resolve(
				requesterId,
				"reject",
				null,
				"Could not reject the request."
			)
	};
}
