import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import { SegmentedControl } from "../segmented-control/segmented-control";
import { type SegmentedOption } from "../segmented-control/segmented-control.model";
import { type ViewModeOption } from "./view-mode-toggle.model";

@Component({
	selector: "app-view-mode-toggle",
	imports: [SegmentedControl],
	template: `
		<app-segmented-control
			label="View mode"
			semantics="toggle"
			iconOnly
			[options]="segments()"
			[(value)]="value"
		/>
	`,
	host: { class: "contents" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewModeToggle<T extends string> {
	readonly options = input.required<readonly ViewModeOption<T>[]>();
	readonly value = model.required<T>();

	protected readonly segments = computed<SegmentedOption<T>[]>(() =>
		this.options().map(option => ({
			value: option.value,
			label: option.label,
			icon: option.icon,
			hint: option.title ?? `${option.label} view`
		}))
	);
}
