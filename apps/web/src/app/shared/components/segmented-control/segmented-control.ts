import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";

export interface SegmentedOption<T extends string = string> {
	value: T;
	label: string;
	count?: number;
}

@Component({
	selector: "app-segmented-control",
	template: `
		<div
			role="radiogroup"
			class="inline-flex gap-0.5 p-1 bg-input-bg border border-line rounded-card"
			[attr.aria-label]="label()"
		>
			@for (option of options(); track option.value) {
				<button
					type="button"
					role="radio"
					class="inline-flex items-center gap-1 h-7 pointer-coarse:min-h-[44px] px-3 rounded-md border-0 text-xs font-medium cursor-pointer transition"
					[class]="
						value() === option.value
							? 'bg-surface-hover text-fg'
							: 'bg-transparent text-fg-muted hover:text-fg'
					"
					[attr.aria-checked]="value() === option.value"
					(click)="value.set(option.value)"
				>
					{{ option.label }}
					@if (option.count !== undefined) {
						<span class="tabular-nums text-fg-muted">{{
							option.count
						}}</span>
					}
				</button>
			}
		</div>
	`,
	host: { class: "inline-block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class SegmentedControl<T extends string = string> {
	readonly options = input.required<SegmentedOption<T>[]>();
	readonly label = input.required<string>();
	readonly value = model.required<T>();
}
