import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";
import { NgpButton } from "ng-primitives/button";

import { UiCountBadge } from "../count-badge/ui-count-badge";

export type UiFiltersButtonLabelVisibility = "always" | "wide";

@Component({
	selector: "button[uiFiltersButton]",
	imports: [UiCountBadge],
	template: `
		<span aria-hidden="true" class="material-icons text-lg">tune</span>
		<span
			aria-hidden="true"
			[class.max-sm:hidden]="labelVisibility() === 'wide'"
			><ng-content>{{ label() }}</ng-content></span
		>
		@if (count() > 0) {
			<ui-count-badge aria-hidden="true" [count]="count()" />
		}
	`,
	hostDirectives: [{ directive: NgpButton, inputs: ["disabled"] }],
	host: {
		type: "button",
		class: "ui-button h-10 shrink-0",
		"data-variant": "secondary",
		"data-size": "md",
		"[attr.data-active]": "active() ? '' : null",
		"[attr.aria-label]": "accessibleName()",
		"[attr.aria-haspopup]": "popup()"
	},
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiFiltersButton {
	readonly count = input(0);
	readonly active = input(false, { transform: booleanAttribute });
	readonly label = input("Filters");
	readonly labelVisibility = input<UiFiltersButtonLabelVisibility>("wide");
	readonly popup = input<"dialog" | null>("dialog");

	protected readonly accessibleName = computed(() =>
		this.count() > 0
			? `${this.label()}, ${this.count()} active`
			: this.label()
	);
}
