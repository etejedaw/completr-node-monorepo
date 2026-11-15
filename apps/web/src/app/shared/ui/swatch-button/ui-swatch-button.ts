import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

export type UiSwatchShape = "square" | "circle";

const touchTarget = "max-md:size-[44px] tap:size-[44px]";
const fillBase = `${touchTarget} inline-flex items-center justify-center transition`;
const outlined = "border hover:border-brand";
const ringSelected = "ring-2 ring-fg/80 ring-offset-2 ring-offset-sidebar";

@Component({
	selector: "button[uiSwatchButton]",
	template: "<ng-content />",
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		"[class]": "hostClass()",
		"[style.background]": "color()",
		"[attr.aria-pressed]": "selected()"
	}
})
export class UiSwatchButton {
	readonly selected = input(false);
	readonly shape = input<UiSwatchShape>("square");
	readonly color = input<string | null>(null);

	protected readonly hostClass = computed(() => {
		const selected = this.selected();
		if (this.shape() === "square") {
			return `size-9 ${fillBase} rounded-card ${outlined} ${
				selected ? "border-brand bg-brand-subtle" : "border-line"
			}`;
		}
		if (this.color()) {
			return `size-8 ${fillBase} rounded-full ${
				selected ? ringSelected : ""
			}`;
		}
		return `size-8 ${fillBase} rounded-full ${outlined} text-fg-muted ${
			selected ? `border-brand ${ringSelected}` : "border-line"
		}`;
	});
}
