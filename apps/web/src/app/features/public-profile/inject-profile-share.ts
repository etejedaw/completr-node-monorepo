import { DOCUMENT, inject } from "@angular/core";

import { ToastService } from "../../core/services/toast";

const QUERY_SEPARATOR = "?";

export function injectProfileShare() {
	const document = inject(DOCUMENT);
	const toast = inject(ToastService);

	return function shareProfile(displayName: string) {
		const url = (document.defaultView?.location.href ?? "").split(
			QUERY_SEPARATOR
		)[0];
		if (navigator.share) {
			navigator
				.share({ title: `${displayName} on Completr`, url })
				.catch(() => undefined);
			return;
		}
		navigator.clipboard
			?.writeText(url)
			.then(() => toast.success("Profile link copied."))
			.catch(() => toast.warning("Could not copy the link."));
	};
}
