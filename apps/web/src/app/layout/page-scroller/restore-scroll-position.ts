import { afterNextRender, type Injector } from "@angular/core";

const RESTORE_TIMEOUT_MS = 3000;
const RESTORE_TOLERANCE_PX = 1;
const USER_SCROLL_INTENTS = [
	"wheel",
	"touchstart",
	"pointerdown",
	"keydown"
] as const;

export function restoreScrollPosition(
	scroller: HTMLElement,
	target: number,
	injector: Injector,
	onSettled: () => void
): () => void {
	let settled = false;
	const contentObserver =
		typeof ResizeObserver === "undefined"
			? null
			: new ResizeObserver(() => scrollToTarget());
	const timeout = setTimeout(() => settle(), RESTORE_TIMEOUT_MS);
	const renderRef = afterNextRender(
		{ write: () => scrollToTarget() },
		{ injector }
	);

	function settle() {
		if (settled) return;
		settled = true;
		clearTimeout(timeout);
		contentObserver?.disconnect();
		renderRef.destroy();
		for (const intent of USER_SCROLL_INTENTS) {
			scroller.removeEventListener(intent, settle);
		}
		onSettled();
	}

	function scrollToTarget() {
		if (settled) return;
		scroller.scrollTop = target;
		const reached =
			Math.abs(scroller.scrollTop - target) <= RESTORE_TOLERANCE_PX;
		if (reached) settle();
	}

	for (const intent of USER_SCROLL_INTENTS) {
		scroller.addEventListener(intent, settle, { passive: true });
	}
	for (const child of Array.from(scroller.children)) {
		contentObserver?.observe(child);
	}

	return settle;
}
