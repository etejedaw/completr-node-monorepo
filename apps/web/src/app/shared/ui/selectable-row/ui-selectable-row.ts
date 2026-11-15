import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

export type UiSelectableRowVariant = "row" | "card";

const focusRing =
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const rowClass = `w-full min-h-[52px] bg-transparent border-0 text-left rounded-md cursor-pointer transition hover:bg-surface-hover disabled:cursor-default disabled:opacity-60 ${focusRing}`;

const cardClass = `w-full min-h-[44px] rounded-card border bg-input-bg text-left cursor-pointer transition hover:border-brand enabled:hover:bg-brand-subtle disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-line ${focusRing}`;

@Component({
	selector: "button[uiSelectableRow]",
	template: "<ng-content />",
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		"[class]": "hostClass()",
		"[attr.aria-pressed]": "selected()"
	}
})
export class UiSelectableRow {
	readonly variant = input<UiSelectableRowVariant>("row");
	readonly selected = input<boolean | null>(null);

	protected readonly hostClass = computed(() => {
		const selected = this.selected() === true;
		if (this.variant() === "row") {
			return `${rowClass} ${selected ? "bg-brand-subtle" : ""}`;
		}
		return `${cardClass} ${
			selected ? "border-brand bg-brand-subtle" : "border-line"
		}`;
	});
}
