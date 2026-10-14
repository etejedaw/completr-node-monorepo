import {
	ChangeDetectionStrategy,
	Component,
	input,
	model
} from "@angular/core";

import { UiInput } from "../../ui";

function toNullableNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const parsed = Number(trimmed);
	return Number.isNaN(parsed) ? null : parsed;
}

@Component({
	selector: "app-range-inputs",
	imports: [UiInput],
	template: `
		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-[0.6875rem] text-fg-muted">
					<span class="sr-only">{{ label() }}, </span>{{ minLabel() }}
				</span>
				<input
					uiInput
					type="number"
					inputmode="decimal"
					[attr.min]="lowerBound()"
					[attr.max]="upperBound()"
					[attr.step]="step()"
					[attr.placeholder]="minPlaceholder()"
					[value]="min() ?? ''"
					(input)="min.set(parse($any($event.target).value))"
				/>
			</label>
			<label class="flex flex-col gap-1 min-w-0">
				<span class="text-[0.6875rem] text-fg-muted">
					<span class="sr-only">{{ label() }}, </span>{{ maxLabel() }}
				</span>
				<input
					uiInput
					type="number"
					inputmode="decimal"
					[attr.min]="lowerBound()"
					[attr.max]="upperBound()"
					[attr.step]="step()"
					[attr.placeholder]="maxPlaceholder()"
					[value]="max() ?? ''"
					(input)="max.set(parse($any($event.target).value))"
				/>
			</label>
		</div>
	`,
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RangeInputs {
	readonly label = input.required<string>();
	readonly minLabel = input("Min");
	readonly maxLabel = input("Max");
	readonly minPlaceholder = input<string | null>(null);
	readonly maxPlaceholder = input<string | null>("Any");
	readonly lowerBound = input<number | null>(0);
	readonly upperBound = input<number | null>(null);
	readonly step = input<number | "any">("any");
	readonly min = model<number | null>(null);
	readonly max = model<number | null>(null);

	protected readonly parse = toNullableNumber;
}
