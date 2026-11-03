import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

export type UiBadgeTone =
	| "neutral"
	| "success"
	| "warning"
	| "danger"
	| "info"
	| "brand"
	| "premium"
	| "admin";

const TONE_CLASSES: Record<UiBadgeTone, string> = {
	neutral: "bg-surface border-line text-fg-secondary",
	success: "bg-success/10 border-transparent text-success",
	warning: "bg-warning/10 border-transparent text-warning",
	danger: "bg-danger/10 border-transparent text-danger",
	info: "bg-info/15 border-transparent text-info",
	brand: "bg-brand-subtle border-transparent text-brand",
	premium: "bg-premium/15 border-transparent text-premium",
	admin: "bg-admin-metal border-transparent text-admin"
};

@Component({
	selector: "ui-badge",
	template: `
		@if (icon()) {
			<span aria-hidden="true" class="material-icons shrink-0 text-sm">{{
				icon()
			}}</span>
		}
		<span class="min-w-0 truncate"><ng-content /></span>
	`,
	host: {
		class: "inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold leading-4",
		"[class]": "toneClass()"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiBadge {
	readonly tone = input<UiBadgeTone>("neutral");
	readonly icon = input<string | null>(null);

	protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
}
