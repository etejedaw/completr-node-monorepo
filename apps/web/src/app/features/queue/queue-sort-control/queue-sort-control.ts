import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	model
} from "@angular/core";

import {
	OptionPicker,
	type PickerOption
} from "../../../shared/components/option-picker/option-picker";
import { QUEUE_SORT_OPTIONS, type QueueSort } from "../queue-order";

const QUEUE_SORT_ICONS: Record<QueueSort, string> = {
	manual: "drag_indicator",
	ratio: "trending_up",
	score: "star",
	duration: "timer"
};

@Component({
	selector: "app-queue-sort-control",
	imports: [OptionPicker],
	template: `
		<app-option-picker
			class="md:hidden"
			label="Sort"
			heading="Sort queue by"
			[options]="pickerOptions()"
			[value]="value()"
			(valueChange)="value.set($any($event))"
		/>
		<app-option-picker
			class="max-md:hidden shrink-0"
			variant="compact"
			size="md"
			label="Sort"
			heading="Sort queue by"
			[options]="pickerOptions()"
			[value]="value()"
			(valueChange)="value.set($any($event))"
		/>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class QueueSortControl {
	readonly value = model<QueueSort>("manual");
	readonly manualLabel = input("My order");

	protected readonly options = computed(() =>
		QUEUE_SORT_OPTIONS.map(option =>
			option.value === "manual"
				? { ...option, label: this.manualLabel() }
				: option
		)
	);

	protected readonly pickerOptions = computed<PickerOption[]>(() =>
		this.options().map(option => ({
			value: option.value,
			label: option.label,
			icon: QUEUE_SORT_ICONS[option.value]
		}))
	);
}
