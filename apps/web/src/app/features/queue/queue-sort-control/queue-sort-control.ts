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
		<div
			role="radiogroup"
			aria-label="Sort queue"
			class="max-md:hidden flex gap-0.5 p-1 bg-input-bg border border-line rounded-card overflow-x-auto [scrollbar-width:none]"
		>
			@for (option of options(); track option.value) {
				<button
					type="button"
					role="radio"
					class="shrink-0 h-8 pointer-coarse:min-h-[44px] px-3 rounded-md border-0 text-xs font-medium cursor-pointer transition"
					[class]="
						value() === option.value
							? 'bg-surface-hover text-fg'
							: 'bg-transparent text-fg-muted hover:text-fg'
					"
					[attr.aria-checked]="value() === option.value"
					(click)="value.set(option.value)"
				>
					{{ option.label }}
				</button>
			}
		</div>
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
