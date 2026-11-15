import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";
import { NgpSwitch, NgpSwitchThumb } from "ng-primitives/switch";

@Component({
	selector: "ui-switch",
	imports: [NgpSwitch, NgpSwitchThumb],
	template: `
		<button
			type="button"
			class="ui-switch__track tap-area"
			ngpSwitch
			[(ngpSwitchChecked)]="checked"
			[ngpSwitchDisabled]="disabled()"
			[attr.aria-label]="ariaLabel() || label() || null"
			[attr.aria-describedby]="ariaDescribedBy() || null"
		>
			<span ngpSwitchThumb class="ui-switch__thumb"></span>
		</button>
		@if (label()) {
			<span class="ui-switch__label">{{ label() }}</span>
		}
		<ng-content />
	`,
	host: { class: "ui-switch" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSwitch {
	checked = model(false);
	disabled = input(false);
	label = input<string>("");
	ariaLabel = input<string>("");
	ariaDescribedBy = input<string>("");
}
