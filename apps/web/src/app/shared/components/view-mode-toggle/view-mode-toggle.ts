import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import { UiSegmentedControl, type UiSegmentedOption } from "../../ui";
import { type ViewModeOption } from "./view-mode-toggle.model";

@Component({
	selector: "app-view-mode-toggle",
	imports: [UiSegmentedControl],
	template: `
		<ui-segmented-control
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

	protected readonly segments = computed<UiSegmentedOption<T>[]>(() =>
		this.options().map(option => ({
			value: option.value,
			label: option.label,
			icon: option.icon,
			hint: option.title ?? `${option.label} view`
		}))
	);
}
