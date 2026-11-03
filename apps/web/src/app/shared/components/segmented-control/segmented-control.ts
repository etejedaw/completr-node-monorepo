import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";

import {
	type SegmentedControlSemantics,
	type SegmentedOption
} from "./segmented-control.model";

@Component({
	selector: "app-segmented-control",
	template: `
		<div
			[attr.role]="semantics() === 'radio' ? 'radiogroup' : 'group'"
			class="inline-flex gap-0.5 p-1 bg-input-bg border border-line rounded-card"
			[attr.aria-label]="label()"
		>
			@for (option of options(); track option.value) {
				<button
					type="button"
					[attr.role]="semantics() === 'radio' ? 'radio' : null"
					class="inline-flex items-center justify-center gap-1 tap:min-h-[44px] tap:min-w-[44px] rounded-md border-0 text-xs font-medium cursor-pointer transition"
					[class]="
						(iconOnly()
							? 'px-2.5 py-1.5 max-sm:h-10 max-sm:px-3.5 '
							: 'h-7 px-3 ') +
						(value() === option.value
							? 'bg-surface-hover text-fg'
							: 'bg-transparent text-fg-muted hover:text-fg')
					"
					[attr.aria-checked]="
						semantics() === 'radio'
							? value() === option.value
							: null
					"
					[attr.aria-pressed]="
						semantics() === 'toggle'
							? value() === option.value
							: null
					"
					[attr.title]="
						option.hint ?? (iconOnly() ? option.label : null)
					"
					(click)="value.set(option.value)"
				>
					@if (option.icon) {
						<span
							aria-hidden="true"
							class="material-icons"
							[class.text-sm]="!iconOnly()"
							[class.text-base]="iconOnly()"
							>{{ option.icon }}</span
						>
					}
					@if (iconOnly()) {
						<span class="sr-only">{{ option.label }}</span>
					} @else {
						{{ option.label }}
					}
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
	readonly options = input.required<readonly SegmentedOption<T>[]>();
	readonly label = input.required<string>();
	readonly iconOnly = input(false, { transform: booleanAttribute });
	readonly semantics = input<SegmentedControlSemantics>("radio");
	readonly value = model.required<T>();
}
