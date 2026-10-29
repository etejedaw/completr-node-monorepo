import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";

import { type SegmentedOption } from "./segmented-control.model";

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
					class="inline-flex items-center justify-center gap-1 h-7 tap:min-h-[44px] tap:min-w-[44px] px-3 rounded-md border-0 text-xs font-medium cursor-pointer transition"
					[class]="
						value() === option.value
							? 'bg-surface-hover text-fg'
							: 'bg-transparent text-fg-muted hover:text-fg'
					"
					[attr.aria-checked]="value() === option.value"
					[attr.title]="option.hint ?? null"
					(click)="value.set(option.value)"
				>
					@if (option.icon) {
						<span
							aria-hidden="true"
							class="material-icons text-sm"
							>{{ option.icon }}</span
						>
					}
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
