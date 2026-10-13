import {
	afterNextRender,
	DestroyRef,
	DOCUMENT,
	ElementRef,
	inject
} from "@angular/core";

export function injectBodyPortal(options: { restoreFocus?: boolean } = {}) {
	const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	const document = inject(DOCUMENT);
	const previouslyFocused = document.activeElement;

	afterNextRender({
		write: () => {
			const focused = document.activeElement;
			document.body.appendChild(host);
			if (focused instanceof HTMLElement && host.contains(focused))
				focused.focus();
		}
	});

	inject(DestroyRef).onDestroy(() => {
		const focusWasInside = host.contains(document.activeElement);
		host.remove();
		if (
			options.restoreFocus &&
			(focusWasInside || document.activeElement === document.body) &&
			previouslyFocused instanceof HTMLElement &&
			previouslyFocused.isConnected
		)
			previouslyFocused.focus({ preventScroll: true });
	});
}
