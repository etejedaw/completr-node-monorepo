import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input
} from "@angular/core";

import { UiProgress } from "../../ui";

@Component({
	selector: "app-progress-meter",
	imports: [UiProgress],
	template: `
		<div class="flex items-center justify-between gap-3 text-xs">
			<span
				class="font-semibold uppercase tracking-[0.14em] text-fg-muted"
				>{{ label() }}</span
			>
			<span
				class="flex items-center gap-1.5 font-semibold text-fg tabular-nums"
			>
				@if (isComplete()) {
					<span class="inline-flex items-center gap-0.5 text-success">
						<span aria-hidden="true" class="material-icons text-sm"
							>military_tech</span
						>
						Completed
					</span>
				}
				{{ completed() }}/{{ total() }}
			</span>
		</div>
		<ui-progress
			[value]="completed()"
			[max]="total() || 1"
			indicatorClass="bg-gradient-to-r from-brand to-success"
		/>
	`,
	host: { class: "flex flex-col gap-1.5" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressMeter {
	readonly label = input.required<string>();
	readonly completed = input.required<number>();
	readonly total = input.required<number>();

	protected readonly isComplete = computed(
		() => this.total() > 0 && this.completed() >= this.total()
	);
}
