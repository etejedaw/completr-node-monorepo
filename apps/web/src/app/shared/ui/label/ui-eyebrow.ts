import { computed, Directive, input } from "@angular/core";

export type UiEyebrowTone = "muted" | "brand" | "premium";

const TONE_CLASSES: Record<UiEyebrowTone, string> = {
	muted: "text-[0.625rem] tracking-[0.16em] text-fg-muted",
	brand: "text-[0.6875rem] tracking-[0.2em] text-brand",
	premium: "text-[0.6875rem] tracking-[0.2em] text-premium"
};

@Directive({
	selector: "[uiEyebrow]",
	host: {
		class: "block font-semibold uppercase",
		"[class]": "toneClass()"
	}
})
export class UiEyebrow {
	readonly tone = input<UiEyebrowTone>("muted");

	protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
}
