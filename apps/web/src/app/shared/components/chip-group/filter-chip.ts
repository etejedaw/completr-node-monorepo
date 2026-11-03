import { computed, Directive, input } from "@angular/core";

export type FilterChipSize = "sm" | "md";
export type FilterChipTouchTarget = "grow" | "area";

const BASE_CLASS =
	"inline-flex items-center justify-center gap-1.5 rounded-full border font-medium font-sans cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const SIZE_CLASSES: Record<FilterChipSize, string> = {
	sm: "px-3 py-1.5 text-xs",
	md: "h-9 px-3.5 text-sm backdrop-blur"
};

const IDLE_CLASSES: Record<FilterChipSize, string> = {
	sm: "border-line bg-input-bg text-fg-secondary hover:border-line-hover hover:text-fg",
	md: "border-line bg-surface/60 text-fg-secondary hover:border-line-hover hover:text-fg"
};

const SELECTED_CLASS = "border-brand bg-brand-subtle text-brand";

const TOUCH_TARGET_CLASSES: Record<FilterChipTouchTarget, string> = {
	grow: "tap:min-h-[44px] tap:min-w-[44px]",
	area: "tap-area shrink-0"
};

@Directive({
	selector: "button[appFilterChip]",
	host: {
		type: "button",
		"[class]": "classes()",
		"[attr.data-selected]": "selected() ? '' : null"
	}
})
export class FilterChip {
	readonly chipSize = input<FilterChipSize>("sm");
	readonly selected = input(false);
	readonly touchTarget = input<FilterChipTouchTarget>("grow");

	protected readonly classes = computed(() =>
		[
			BASE_CLASS,
			SIZE_CLASSES[this.chipSize()],
			this.selected() ? SELECTED_CLASS : IDLE_CLASSES[this.chipSize()],
			TOUCH_TARGET_CLASSES[this.touchTarget()]
		].join(" ")
	);
}
