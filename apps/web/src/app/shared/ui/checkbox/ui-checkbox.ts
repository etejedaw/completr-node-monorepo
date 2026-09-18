import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";
import { NgpCheckbox } from "ng-primitives/checkbox";

@Component({
	selector: "ui-checkbox",
	imports: [NgpCheckbox],
	template: `
		<span
			class="ui-checkbox__box"
			ngpCheckbox
			[(ngpCheckboxChecked)]="checked"
			[ngpCheckboxDisabled]="disabled()"
		>
			<svg
				class="ui-checkbox__indicator"
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M3.5 8.5L6.5 11.5L12.5 4.5"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</span>
		@if (label()) {
			<span class="ui-checkbox__label">{{ label() }}</span>
		}
		<ng-content />
	`,
	host: { class: "ui-checkbox" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiCheckbox {
	checked = model(false);
	disabled = input(false);
	label = input<string>("");
}
