const FOCUSABLE_SELECTOR = "input, button, [tabindex]";

export function scrollIntoViewAndFocus(container: HTMLElement) {
	const focusable = container.matches(FOCUSABLE_SELECTOR)
		? container
		: container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
	container.scrollIntoView({ block: "center", behavior: "smooth" });
	focusable?.focus({ preventScroll: true });
}
