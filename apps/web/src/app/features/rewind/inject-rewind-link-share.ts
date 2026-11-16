import { DOCUMENT, inject } from "@angular/core";

import { ToastService } from "../../core/services/toast";
import { rewindShareUrl } from "./rewind";
import { REWIND_SHARE_COPY } from "./rewind-share-copy";

const TOUCH_POINTER_QUERY = "(pointer: coarse)";

export interface RewindLinkShareTarget {
	username: string;
	year: number;
	title: string;
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

export function injectRewindLinkShare() {
	const view = inject(DOCUMENT).defaultView;
	const toast = inject(ToastService);
	const copy = REWIND_SHARE_COPY;
	let busy = false;

	function prefersNativeShare(): boolean {
		return (
			typeof view?.navigator.share === "function" &&
			view.matchMedia?.(TOUCH_POINTER_QUERY).matches === true
		);
	}

	async function copyLink(url: string) {
		const clipboard = view?.navigator.clipboard;
		if (!clipboard) {
			toast.warning(copy.copyFailed);
			return;
		}
		try {
			await clipboard.writeText(url);
			toast.success(copy.linkCopied);
		} catch {
			toast.warning(copy.copyFailed);
		}
	}

	async function shareNatively(url: string, title: string) {
		try {
			await view!.navigator.share({ title, url });
		} catch (error) {
			if (!isAbortError(error)) await copyLink(url);
		}
	}

	return async function shareRewindLink(target: RewindLinkShareTarget) {
		if (busy) return;
		busy = true;
		const url = rewindShareUrl(target.username, target.year);
		try {
			if (prefersNativeShare()) await shareNatively(url, target.title);
			else await copyLink(url);
		} finally {
			busy = false;
		}
	};
}
